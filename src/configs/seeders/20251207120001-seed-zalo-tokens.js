import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "62qa076Nc0OPB2OFT9YI1naYBmD_WEry44TPV7keXtzWV6KYQvJGLNTS4Yrovjn76HWJFJ_wp6GpFX0v8-JIGnOY1Yi6_Bej3IfaRGEIf1OoGNeJAe2vLWDv32mzlTClKrOaHsg2x0HFOYi2PwoHUc1PKHDQkPXYLb91OslkzMSDAoyDFCxqMISwJmess8XE1pT83H3LYcbtRJ0NV9RmRaOj46fInTCJUo1iT1VgrYOO9H5VCiFUAGXsQrvYbQqSH5P7OLZgZnfn2ZDPV-Bq6HStBLaowzaeBZKO8Jd_h28aHNvm4Q-VC2WG8sSvoEWpK21TMZh4lHCLVbLg6fkFCWadOr9WvRufPG5VBKtLYcXt74eDHzw5V6ybRdrdmeWTNXngLsN3qLDyUYeCSfBMJsbzQpDSlwn4NuoDC7EFc0O",
            refresh_token:
                "r0PgSVvFYdNL1sX--q20TDK9ONBmMCWNhqHsO_f-ppoAQbSzsrVqJgjXQ2pZAubQYsG00zXF_7gXO7LbrchyPw8d70tAABfiZo8x2CGNfmAWBHXOzsEjMjvG4ZYOOA8vmMj6J8HizI-rN6rrc4kFFlTtSs2aU_jZqKr3EvTYpMt5MYnjjKcICy9O5MtlKVKclMi9VV9RlJwYPGLVy52vMwOTMGQN0_5DtJ1o5Q0Dv4lZAan0dGJ40VShOdMv5y5parbPBzLV-NJxIc8If0Nu6FfNMKEVRVa0jYHHL_KYzow6EMT6mot00QncKbQ9OSWhxLLIK8TRx0Nm54eFsJpDQgaCTItmFFmiWNjzIjzgpZxqE5rKtGdc4_81G1cV6y9ijZ5U5_WXtKhTDtO-Z73pInn_qJByLufr",
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
