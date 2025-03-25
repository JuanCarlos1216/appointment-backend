import { APIGatewayEvent, APIGatewayProxyResult, Context, SQSEvent } from 'aws-lambda';
import { SNSService } from '../../infrastructure/aws/SNSService';
import { DynamoDBRepository } from '../../infrastructure/aws/DynamoDBRepository';
import { AppointmentService } from '../services/AppointmentService';
import { AppointmentDTO } from '../dtos/AppointmentDTO';
import { config } from '../../config/config';

const dynamoDBRepository: DynamoDBRepository = new DynamoDBRepository();

export const handler = async (event: APIGatewayEvent | SQSEvent, context: Context): Promise<APIGatewayProxyResult> => {

    if ('httpMethod' in event) return handleApiGateway(event);

    if ('Records' in event) return handleSQSEvent(event);

    return {
        statusCode: 400,
        body: JSON.stringify({
            message: 'Invalid event type.'
        })
    };

};

const handleApiGateway = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {

    const httpMethod = event?.httpMethod && event?.httpMethod !== '' ? event.httpMethod : 'GET';

    try {

        if (httpMethod === 'POST') { 

            const params = event?.body ? JSON.parse(event?.body) : {};

            const { insuredId, scheduleId, countryISO } = params;

            if (!insuredId || !scheduleId || !countryISO) console.log('Faltan parámetros');

            const appointmentDTO: AppointmentDTO = new AppointmentDTO(insuredId, scheduleId, 'pending', countryISO);

            // Guardamos la cita en DynamoDB con estado "pending"
            await dynamoDBRepository.save(appointmentDTO);

            // Selección del topic de SNS según el countryISO
            const topicArn: string = config.aws.sns[countryISO]?.topicArn;

            if (!topicArn) {
                console.log('No se encontró País')
            }

            const snsService: SNSService = new SNSService(topicArn);

            const appointmentService: AppointmentService = new AppointmentService(dynamoDBRepository, snsService);

            // Enviamos la cita a SNS
            await snsService.publish(JSON.stringify(appointmentDTO));

            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: 'Appointment pending.'
                })
            };

        }

        if (httpMethod === 'GET') {

            const params = event?.pathParameters ? event?.pathParameters : {}

            const { insuredId } = params;

            if (!insuredId) return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Faltan parámetros'
                })
            };

            const appointmentService: AppointmentService = new AppointmentService(dynamoDBRepository);

            const response = await appointmentService.getAppointmentByInsuredId(insuredId);

            return {
                statusCode: 200,
                body: JSON.stringify({ data: response })
            };

        }

        return {
            statusCode: 404,
            body: JSON.stringify({
                message: 'Método no encontrado'
            })
        };
        
    } catch (error) {
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal server error.'
            })
        };

    }

};

const handleSQSEvent = async (event: SQSEvent): Promise<APIGatewayProxyResult> => {

    try {

        // Obtenemos el detalle del evento enviado por SNS
        const detailEvent = JSON.parse(event.Records[0].body).detail;
    
        if (!detailEvent?.insuredId || !detailEvent?.scheduleId || !detailEvent?.status) console.log('Faltan parámetros');

        // Creamos el servicio de DynamoDB para actualizar la cita
        const appointmentService: AppointmentService = new AppointmentService(dynamoDBRepository);

        // Llamamos al método para actualizar el estado de la cita a "completed" en DynamoDB
        await appointmentService.updateAppointmentStatus(detailEvent?.insuredId, detailEvent?.scheduleId, 'completed');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Appointment updated to completed.'
            })
        };
        
    } catch (error) {
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal server error.'
            })
        };

    }

};
