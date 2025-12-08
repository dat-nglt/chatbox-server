import { sequelize } from "../configs/database.js";
import { DataTypes } from "sequelize";

// 1. Import các model cần thiết cho chatbox
import ZaloTokens from "./zalo.token.model.js";
import ApiKeys from "./api-keys.model.js";

const db = {};

// 2. Gom các model cần thiết
const modelDefiners = [
  ZaloTokens,
  ApiKeys,
];

// 3. Khởi tạo từng model
modelDefiners.forEach((modelDefiner) => {
  const model = modelDefiner(sequelize, DataTypes);
  db[model.name] = model;
});

// 4. Gọi associate nếu có
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// 5. Thêm sequelize instance
db.sequelize = sequelize;

// 6. Export
export default db;