import { handler } from '../../src/application/handlers/appointment';
import { APIGatewayEvent, Context } from 'aws-lambda';
import { SNSService } from '../../src/infrastructure/aws/SNSService';
import { DynamoDBRepository } from '../../src/infrastructure/aws/DynamoDBRepository';
import { AppointmentService } from '../../src/application/services/AppointmentService';

// Mocks de servicios
jest.mock('../src/infrastructure/aws/SNSService');
jest.mock('../src/infrastructure/aws/DynamoDBRepository');
jest.mock('../src/services/AppointmentService');

describe('appointment.ts tests', () => {
  beforeEach(() => {
    // Mocking SNS and DynamoDB
    SNSService.prototype.publish = jest.fn().mockResolvedValue({ MessageId: 'mock-message-id' });
    DynamoDBRepository.prototype.save = jest.fn().mockResolvedValue(true); // Mock save method for DynamoDB
  });

  afterEach(() => {
    jest.clearAllMocks();  // Limpiar mocks después de cada prueba
  });

  test('should return 201 if appointment is created successfully', async () => {
    const mockSNS = new SNSService('mockTopicArn');
    const mockDynamoDB = new DynamoDBRepository();
    const mockAppointmentService = new AppointmentService(mockDynamoDB, mockSNS);

    // Mocking the service methods
    mockAppointmentService.createAppointment = jest.fn().mockResolvedValue(true);
    mockSNS.publish = jest.fn().mockResolvedValue(true);

    const event: any = {
        httpMethod: 'POST',
        body: JSON.stringify({
          insuredId: '123',
          scheduleId: '456',
          countryISO: 'PE',
        }),
        headers: {},  // Simula los headers vacíos
        isBase64Encoded: false,
      };
      
    const context: Context = {} as Context;

    const result = await handler(event, context);

    expect(result.statusCode).toBe(201);
    expect(result.body).toBe(JSON.stringify({ message: 'Appointment pending.' }));
    expect(mockAppointmentService.createAppointment).toHaveBeenCalled();
  });

  test('should return 400 if missing required fields', async () => {
    const event: any = {
        httpMethod: 'POST',
        body: JSON.stringify({
          insuredId: '123',
          scheduleId: '456',
          countryISO: 'PE',
        }),
        headers: {},  // Simula los headers vacíos
        isBase64Encoded: false,
      };
      
    const context: Context = {} as Context;

    const result = await handler(event, context);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(JSON.stringify({ message: 'Missing required fields.' }));
  });

  test('should return 500 if an internal error occurs', async () => {
    const mockSNS = new SNSService('mockTopicArn');
    const mockDynamoDB = new DynamoDBRepository();
    const mockAppointmentService = new AppointmentService(mockDynamoDB, mockSNS);

    // Simulate an error in service
    mockAppointmentService.createAppointment = jest.fn().mockRejectedValue(new Error('Some error'));

    const event: any = {
        httpMethod: 'POST',
        body: JSON.stringify({
          insuredId: '123',
          scheduleId: '456',
          countryISO: 'PE',
        }),
        headers: {},  // Simula los headers vacíos
        isBase64Encoded: false,
      };
      
    const context: Context = {} as Context;

    const result = await handler(event, context);

    expect(result.statusCode).toBe(500);
    expect(result.body).toBe(JSON.stringify({ error: 'Some error' }));
  });
});
