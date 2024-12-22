const dbConnection = require("../connections/dbConnection");
const client = dbConnection.getClient();

const saveOrderDetails = async (orderDetails, userId) => {
  try {
    const { id, amount, currency, status } = orderDetails;
    if (!client) {
      return null;
    }
    const query = `INSERT INTO user_orders (order_id, user_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [id, userId, amount/100, currency, status];
  const result = await client.query(query, values);
  return result.rows[0] || null;
  } catch (error) {
    
  }
};


module.exports = {
    saveOrderDetails
}