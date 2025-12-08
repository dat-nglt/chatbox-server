import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "Dq-JJ-Ohm2asJf50uoJAA3P0c4peF9LDDpsZLhmbzM8HJk1rZs_JUZXHY4BiOgznEc--5AzEiYy3J9KUb7d7EWDSmWIEJ-e4ML_CRSriubDzKTbpz4_aMofCmKMXQPeX6NgNAwblkWq_IUmPhthF901A-Z-eSUWOTqVQ7-D7wonHHUWc_KtC02eiboRWCBi7DWYZ7ubhcoezKhqExNRdCJbFz02lSDexBHkB09WOtnmDVCu0idxB0WPv-ZEDTDqq1X77KPi7baLCBRbjtnIBVsincbxZ58XDQZw1UTGRhmH44xycyJMUCtjKfGAfTOW134A_OAbLYcSUQ8HQo5IeI5naYsZoOznPKGJCME4Lvru_DSuzZJRUN3uEqbkT58Hz4dBMJjXQWIjiNPiAm3lB51OhmHvBGUTIOb3aCy0f",
            refresh_token:
                "H6Yk9S7rOK55QQmgnFfhG4LdfIRFuW4o1YQPCyV04WurA8PgiU00TaSUhMAvmnzoEHwlH-_4CcqCAxjLXkWgJb8dYocuwm1AQ2ooMhFC1rT6BBjYcF4nSrape4QzqGTbJ3M11gh1631-8zO8ah5j7495eWsre2W0GNoqEA6pE1f8UfaVghuzVIjZZst9Z2TzLtQSMA-K2NrrQePAeu81K28SYLN--W5gFJ38NVRs3ca8Eh5jtRmuS1Swjrlpr2iy3JUA9_Js139gAxSXlU479q0PoHwAyL8PI17r3exlRMjSCCOCjjro9dOws0ECm5O_UHZW0-VPVpWE5B4rZUOP8tC4WI6CWWaUSrkGTPN93s0LJyTVpQDEM3ynWbNKmonjBWwRJ_Z05LG_NwKsiwl-KiFjOK4",
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
