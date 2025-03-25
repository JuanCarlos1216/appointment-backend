import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { IAppointmentRepository } from '../../domain/repositories/IAppointmentRepository';
import { Appointment } from '../../domain/entities/Appointment';
import { config } from '../../config/config';

export class DynamoDBRepository implements IAppointmentRepository {

    private dynamoDBClient: DynamoDBClient = new DynamoDBClient({
        region: config.aws.region
    });

    private tableName = config.aws.dynamoDB.appointmentTableName || 'Appointments';

    async save(appointment: Appointment): Promise<void> {

        const command: PutItemCommand = new PutItemCommand({
            TableName: this.tableName,
            Item: {
                insuredId: { S: appointment.insuredId },
                scheduleId: { N: String(appointment.scheduleId) },
                status: { S: appointment.status },  // Se guarda como "pending"
                countryISO: { S: appointment.countryISO },
                createdAt: { S: new Date().toISOString() },
                updatedAt: { S: new Date().toISOString() }
            }
        });

        await this.dynamoDBClient.send(command);
    }

    async findByInsuredId(insuredId: string): Promise<Appointment[]> {

        const command = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'insuredId = :id',
            ExpressionAttributeValues: {
                ':id': { S: insuredId }
            }
        });

        const result = await this.dynamoDBClient.send(command);
        const appointments = result.Items ? result.Items.map(item => new Appointment(
            item.insuredId?.S || '', 
            Number(item.scheduleId?.N),
            item.status?.S || '', 
            item.countryISO?.S || '',
            new Date(item.createdAt?.S || Date.now()) ,
            new Date(item.updatedAt?.S || Date.now())
        )) : [];

        return appointments;
    }

    async updateStatus(insuredId: string, scheduleId: number, status: string): Promise<void> {
        const command = new UpdateItemCommand({
            TableName: this.tableName,
            Key: {
                insuredId: { S: insuredId },
                scheduleId: { N: String(scheduleId) }
            },
            UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#updatedAt': 'updatedAt',
            },
            ExpressionAttributeValues: {
                ':status': { S: status },  // Se actualiza el estado a "completed"
                ':updatedAt': { S: new Date().toISOString() }
            }
        });

        await this.dynamoDBClient.send(command);
    }
}
