import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("zalo_tokens", [
        {
            access_token:
                "d0AJ2gJwgZoT0v45eVMWFPqDc0cgxVH-a62_7zpby5BWVOyAbDt8PgvgWmtomCfKg7ssET3gttoH7O4tqRd20OOThLRfuk86qcAeHQlqwN3Y5xWzZkZNVz1ZxZ6OshL3e43D6i3FaN-WSzW9pSwIEeHpy0cpYvL_s1VGIfEoddZs7leLYk2sBFPqxLgw-RCuX5xHTkVVknsGO_1NxUQ_7AL5w5BioTKhqtQIT8_Nsn3EBhPWXDZD2TbizKAmyRSOrbJTBOlDXagmSzuyy-Y23RHFxaJBzzOoe6wDPid2mGJ_VgTtmFFM8_zrZa6WuxykmaljPldqfb32QzuLW-oIO_nOt5E6uR8Ps7hOAfNtvWVDVDTreEsKCkr0ysQxoSWaZMIGHSx4wtQoPvCPy_YhBPXiv4hqmTiT3iu80ARYgZm",
            refresh_token:
                "xP9o4G5nTa3iat0U17vyGUoTUH8FPdj5XliWHHv_N12f-ID7CXb1J96-8aW7MbDLcC8NPNPW47FPtdn6Tr86Jjpf04PPKrboszKy9qbtM3VQqa0SKpKz2R6f9GLSFrPJw8Ce0tSlQ0pKfGqOU3zf4vM4AJWkFauyk8uVFGPfO1QkzmS3FLLV3wpQAIybN5uWgS8V7GbZ622rzLuk9KOwFRJYMoW_U0OAdzTbNYDc0q-HwrbB26qYP8hKOpiMQsKMdzm15GixKZ6ProOSCL92A9Zt6HS6L6yyhTOxOq1IGpJqppCmOrHqCjFMSGrDDt8Wniy_02juCo--yZyWFHz58PQe9JS8BtWdg98uSaC9HNhKhnbLG3LYQFIs5MSTMtKvgSC60KeZLW6bcYWnsjKrPmDfTa0",
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
