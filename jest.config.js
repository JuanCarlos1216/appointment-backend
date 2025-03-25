module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.serverless/'],
  testMatch: ['**/src/application/handlers/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  verbose: true,
};
