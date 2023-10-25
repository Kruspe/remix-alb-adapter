/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./__tests__/setup.ts"],
  testPathIgnorePatterns: ["./__tests__/setup.ts"],
};
