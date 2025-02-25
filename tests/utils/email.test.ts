import { sendEmail, EmailOptions } from '../../src/utils/email';

// Mock console.log
const originalConsoleLog = console.log;
let consoleLogMock: jest.SpyInstance;

describe('Email Utils', () => {
  beforeEach(() => {
    // Mock console.log before each test
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    // Restore original console.log after each test
    consoleLogMock.mockRestore();
    console.log = originalConsoleLog;
  });

  describe('sendEmail', () => {
    it('should log email details when sending an email', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'test-template',
        data: {
          name: 'Test User',
          verificationUrl: 'https://example.com/verify'
        }
      };

      await sendEmail(emailOptions);

      expect(consoleLogMock).toHaveBeenCalledWith('Sending email:', emailOptions);
    });

    it('should handle empty data object', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'test-template',
        data: {}
      };

      await sendEmail(emailOptions);

      expect(consoleLogMock).toHaveBeenCalledWith('Sending email:', emailOptions);
    });

    it('should handle complex data objects', async () => {
      const emailOptions: EmailOptions = {
        to: 'test@example.com',
        subject: 'Test Subject',
        template: 'test-template',
        data: {
          user: {
            name: 'Test User',
            email: 'test@example.com',
            settings: {
              notifications: true,
              theme: 'dark'
            }
          },
          items: [1, 2, 3],
          verified: true
        }
      };

      await sendEmail(emailOptions);

      expect(consoleLogMock).toHaveBeenCalledWith('Sending email:', emailOptions);
    });
  });
});