import { SQSEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { RDSRepository } from '../../infrastructure/database/RDSRepository';
import { AppointmentService } from '../services/AppointmentService';
import { EventBridgeService } from '../../infrastructure/aws/EventBridgeService';
import { AppointmentDTO } from '../dtos/AppointmentDTO';

const rdsRepository = new RDSRepository();
const eventBridgeService = new EventBridgeService();

export const handler = async (event: SQSEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {

        // Verificamos que el evento contenga datos válidos
        if (!event.Records || event.Records.length === 0) console.log('Faltan parámetros');

        // Extraemos el mensaje de SNS
        const snsMessage = JSON.parse(event.Records[0].body);

        // Accedemos a la propiedad "Message" dentro del SNS
        const message = JSON.parse(snsMessage.Message);

        const { insuredId, scheduleId, countryISO } = message;

        if (!insuredId || !scheduleId || !countryISO) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Faltan parámetros' })
            };
        }

        // Crear cita con estado "completed"
        const appointmentDTO = new AppointmentDTO(insuredId, scheduleId, 'completed', countryISO);
        const appointmentService = new AppointmentService(rdsRepository, undefined, eventBridgeService);

        await appointmentService.createAppointment(appointmentDTO);
        // Enviar evento a EventBridge
        await eventBridgeService.sendEvent({ insuredId, scheduleId, status: 'completed', countryISO });

        return {
            statusCode: 201,
            body: JSON.stringify({ message: 'Cita creada en RDS.' })
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error.' })
        };
    }
};
