const pool = require("../config/db");

const addMedicine = async (name, category, stock, price) => {
  const query = `
    INSERT INTO medicines (name, category, stock, price)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const values = [name, category, stock, price];

  const result = await pool.query(query, values);
  return result.rows[0];
};





const getAllMedicines = async () => {
  const result = await pool.query("SELECT * FROM medicines ORDER BY id");
  return result.rows;
};

const updateStock = async (id, stock) => {
    const query = `
        UPDATE medicines
        SET stock = $1
        WHERE id = $2
        RETURNING *;
    `;

    const result = await pool.query(query, [stock, id]);
    return result.rows[0];
};

const deleteMedicine = async (id) => {
    const result = await pool.query(
        "DELETE FROM medicines WHERE id=$1 RETURNING *",
        [id]
    );

    return result.rows[0];
};


const searchMedicine = async (name) => {
    const result = await pool.query(
        "SELECT * FROM medicines WHERE name ILIKE $1",
        [`%${name}%`]
    );

    return result.rows;
};
 

const recommendMedicines = async (id) => {

    // Get category of selected medicine
    const medicine = await pool.query(
        "SELECT category FROM medicines WHERE id = $1",
        [id]
    );

    if (medicine.rows.length === 0) {
        return [];
    }

    const category = medicine.rows[0].category;

    // Recommend other medicines in same category
    const result = await pool.query(
        `SELECT * FROM medicines
         WHERE category = $1
         AND id <> $2`,
        [category, id]
    );

    return result.rows;
};


const getLowStockMedicines = async (threshold) => {
    const result = await pool.query(
        `SELECT * FROM medicines WHERE stock < $1`,
        [threshold]
    );
    return result.rows;
};



module.exports = {
    addMedicine,
    getAllMedicines,
    updateStock,
    deleteMedicine,
    searchMedicine,
    recommendMedicines,
    getLowStockMedicines
};