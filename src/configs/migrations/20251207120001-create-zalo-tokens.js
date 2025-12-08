import { DataTypes } from "sequelize";

export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable("zalo_tokens", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    access_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    refresh_token_expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
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

  // Thêm index nếu cần
  await queryInterface.addIndex("zalo_tokens", ["access_token_expires_at"]);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeIndex("zalo_tokens", ["access_token_expires_at"]);
  await queryInterface.dropTable("zalo_tokens");
  console.log("❌ Dropped zalo_tokens table");
};