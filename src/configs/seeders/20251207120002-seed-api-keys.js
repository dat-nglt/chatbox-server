import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert("api_keys", [
        {
            api_key: "AIzaSyDWO8pTkGUM2Re6QUInWe-Ln6_I70vgKKEfake",
            model: "gemini-2.5-flash-lite",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyDWO8pTkGUM2Re6QUInWe-Ln6_I70vgKKEfake",
            model: "gemini-2.5-flash",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyDuf7hU0uuNJwM0ZkFnG6lzPFg-AotcE4Ifake",
            model: "gemini-2.5-flash-lite",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyDuf7hU0uuNJwM0ZkFnG6lzPFg-AotcE4Ifake",
            model: "gemini-2.5-flash",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyAP5fad99v4nHPBF_k3N26xNTbJS4Y39Y0fake",
            model: "gemini-2.5-flash-lite",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyAP5fad99v4nHPBF_k3N26xNTbJS4Y39Y0fake",
            model: "gemini-2.5-flash",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyDgLKmAHmu1xIEwb8iZzdLdPx39u8PWgGwfake",
            model: "gemini-2.5-flash-lite",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
        {
            api_key: "AIzaSyDgLKmAHmu1xIEwb8iZzdLdPx39u8PWgGwfake",
            model: "gemini-2.5-flash",
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
        },
    ]);
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("api_keys", null, {});
};
