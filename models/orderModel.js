const pool = require("../config/db");

const placeOrder = async (user_id, medicine_id, quantity) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const medicine = await client.query(
            "SELECT * FROM medicines WHERE id=$1 FOR UPDATE",
            [medicine_id]
        );

        if (medicine.rows.length === 0) {
            throw new Error("Medicine not found");
        }

        const med = medicine.rows[0];

        if (med.stock < quantity) {
            throw new Error("Insufficient stock");
        }

        const total = med.price * quantity;

        const order = await client.query(
            `INSERT INTO orders(user_id,total)
             VALUES($1,$2)
             RETURNING *`,
            [user_id, total]
        );

        await client.query(
            `INSERT INTO order_items(order_id,medicine_id,quantity)
             VALUES($1,$2,$3)`,
            [order.rows[0].id, medicine_id, quantity]
        );

        const updatedMedicine = await client.query(
            `UPDATE medicines
             SET stock = stock - $1
             WHERE id = $2
             RETURNING *`,
            [quantity, medicine_id]
        );

        await client.query("COMMIT");

        return {
            order: order.rows[0],
            medicine: updatedMedicine.rows[0]
        };

    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const getOrderDetails = async (id) => {
    const result = await pool.query(
        `SELECT
            o.id,
            o.user_id,
            o.total,
            o.created_at,
            m.name AS medicine_name,
            oi.quantity
         FROM orders o
         JOIN order_items oi
            ON o.id = oi.order_id
         JOIN medicines m
            ON oi.medicine_id = m.id
         WHERE o.id = $1`,
        [id]
    );

    return result.rows[0];
};

module.exports = {
    placeOrder,
    getOrderDetails
};