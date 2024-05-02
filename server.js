require("dotenv").config();
const pg = require('pg');
const client = new pg.Client(
  process.env.DATABASE_URL || `postgres://localhost/${process.env.DB_NAME}`
);
const express = require("express");
const app = express();

app.use(express.json());
app.use(require('morgan')('dev'));

// READ departments
app.get('/api/departments', async(req, res, next) => {
  try {
    const SQL = `SELECT * from departments`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  };
});

// READ employees
app.get('/api/employees', async(req, res, next) => {
  const SQL = `SELECT * from employees`;
  const response = await client.query(SQL);
  res.send(response.rows);
});

// CREATE employees
app.post('/api/employees', async(req, res, next) => {
  try {
    const SQL = /* sql */ `
    INSERT INTO employees(name, department_id)
    VALUES($1, $2)
    RETURNING *
    `;
    const response = await client.query(SQL, [req.body.name, req.body.department_id]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  };
});

// UPDATE employees
app.put('/api/employees/:id', async(req, res, next) => {
  try {
    const SQL = /* sql */`
    UPDATE employees
    SET name=$1, department_id=$2, updated_at=now()
    WHERE id=$3
    RETURNING *
    `;
    const response = await client.query(SQL, [
      req.body.name, 
      req.body.department_id, 
      req.params.id
    ]);
    res.send(response.rows[0])
  } catch (error) {
    next(error);
  };
});

// DELETE employees
app.delete('/api/employees/:id', async(req, res, next) => {
  try {
    const SQL = /* sql */`
    DELETE from employees
    WHERE id=$1
    `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  };
});

// error handling
app.use((error, req, res, next) => {
  res.status(res.status || 500).send({error: error});
});

const init = async () => {
  await client.connect();

  let SQL = /* sql */`
  DROP TABLE IF EXISTS employees;
  DROP TABLE IF EXISTS departments;

  CREATE TABLE departments(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50)
  );

  CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES departments(id) NOT NULL
  )
  `;
  await client.query(SQL);
  console.log('tables created');

  SQL = /* sql */ `
  INSERT INTO departments(name) VALUES('Training');
  INSERT INTO departments(name) VALUES('Recruitment');
  INSERT INTO departments(name) VALUES('Accounting');

  INSERT INTO employees(name, department_id) VALUES('Rory McWillebuggies', 
  (SELECT id from departments WHERE name='Training'));

  INSERT INTO employees(name, department_id) VALUES('Robyn Banks', 
  (SELECT id from departments WHERE name='Recruitment'));

  INSERT INTO employees(name, department_id) VALUES('Carmen Smith', 
  (SELECT id from departments WHERE name='Accounting'));

  INSERT INTO employees(name, department_id) VALUES('Buggly Williams', 
  (SELECT id from departments WHERE name='Accounting'));

  INSERT INTO employees(name, department_id) VALUES('Sir Chapman Chap', 
  (SELECT id from departments WHERE name='Training'));
  `;
  await client.query(SQL);
  console.log('data seeded');

  const port = process.env.PORT;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();