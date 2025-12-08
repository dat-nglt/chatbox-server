import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.bulkInsert("zalo_tokens", [
    {
      access_token: "CpmBQ6KlD6WoFGbdO20-QJ8p06jhE4StKLvmD0GYDd4EHbaz50S4G2TLJpm29JPGLs9f8MyXBqTGFN03O4aoLaGQJHbTRGWTQGD9PqSUBGOMMM459KeiTn0SSdT0LZKl5KfKSoOW5GuAGLH90H0fJWDZQai9DJO_3LjiGmjC9Zq2A4n8MsSCC0ubHNOQR28E27nXTYCyAXCpRXCG6pvK4JzDBays2tOWE5GpP6iyIXvFVGqRVpLLQ5azOcnVR2Kt1d52E25XUqKhDJWf0cTTHIW01oe34Mnq6ryf40a_OKL4KHe4KXrsQ5XeDG5i3cm7EcuAHMjuPIKwEW5vOrnY6Mi_16LuAciUGMeSKHSRKn43IGXsF2DZDcHB12rfAoTnHqLJCsaY9JDCCKmtVaSoT7DFTmffFKnxO2KEDcStD6W",
      refresh_token: "oTEuDmg7J7R8qheu3uX6TyZSipG4a0G7bv2q7Igp2GcHcgqmDQzHSUs7q75hjb9PqRdGIN2hU4Z1cDKENef-Jz-TodHIh3X4uhx5IKMhJ4lteSr4MljX7jd0pmjZacuCquJP5agJK5QDlzn9IwejV8_vssTEpNTJwER6ItpkTNAxpS1CDjTMRAJtf5yok2rkbxkhIJQ870UKcRe49iqI0Od8f2y8-5SVgzRSBMc6AmxChzOGKBHB3zIQxqjkpKnqpOBvRXMBVtQKWODIAvfoKgkPzL0yia8VXOdZBqcFNYlOtgm6Uuuc2CIFfWPNYXCxz96C6rJB25ZxtevkKSP-893C-3mKrrGFkT38ItppT0dJgDX8Sx1STx3hqaGSq49itT72B13aHXoYwEmZQVLYnNS8dqns",
      access_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      refresh_token_expires_at: new Date(Date.now() + 7776000000), // 3 tháng từ now
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.bulkDelete("zalo_tokens", null, {});
};