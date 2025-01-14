const dbConnection = require("../connections/dbConnection");
const client = dbConnection.getClient();

const saveOrderDetails = async (orderDetails, userId) => {
  try {
    const { id, amount, currency } = orderDetails;
    if (!client) {
      return null;
    }
    const query = `INSERT INTO user_orders (order_id, user_id, amount, currency) VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [id, userId, amount/100, currency];
  const result = await client.query(query, values);  
  return result.rows[0] || null;
  } catch (error) {
    console.log(error);
    
  }
};


module.exports = {
    saveOrderDetails
}