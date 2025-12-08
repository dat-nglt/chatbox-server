import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("api_keys", {
    api_key_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    api_key: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    using: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  });

  // Thêm index cho các trường thường được query
  await queryInterface.addIndex("api_keys", ["is_active"]);
  await queryInterface.addIndex("api_keys", ["using"]);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeIndex("api_keys", ["is_active"]);
  await queryInterface.removeIndex("api_keys", ["using"]);
  await queryInterface.dropTable("api_keys");
  console.log("❌ Dropped api_keys table");
};