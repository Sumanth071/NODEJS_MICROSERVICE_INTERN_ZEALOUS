const express = require('express');
const bodyParser = require('body-parser');
const customer = require('./customerSchema');
const mongoose = require('./db');
const Consul = require('consul');
const consul = new Consul();
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const serviceKey = "customer";

// REGISTERING CUSTOMER TO DISCOVERY SERVER
consul.agent.service.register(
  {
    id: serviceKey,
    name: serviceKey,
    address: "localhost",
    port: 6000,
  },
  (err) => {
    if (err) throw err;
    console.log('Customer Service successfully registered');
  }
);

// Deregister from consul discovery server on process interruption
process.on("SIGINT", async () => {
  consul.agent.service.deregister(serviceKey, () => {
    if (err) throw err;
    console.log("Customer service deregistered");
  });
});

// POST CUSTOMER
app.post('/', async (req, res) => {
  try {
    const { fullname, username, password, aadhaar, pan, contact, email } = req.body;

    const obj = new customer({
      fullname,
      username,
      password, 
      aadhaar,
      pan,
      contact,
      email,
    });

    const result = await obj.save();
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// READ CUSTOMER BY ID
app.get('/:id', async (req, res) => {
  try {
    const fetched = await customer.findById(req.params.id);
    res.json(fetched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE CUSTOMER BY ID
app.put('/', async (req, res) => {
  try {
    const result = await customer.updateOne({ _id: req.body._id }, req.body, { upsert: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE CUSTOMER BY ID
app.delete('/:id', async (req, res) => {
  try {
    const deletedCustomer = await customer.findOneAndDelete({ _id: req.params.id });

    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET CUSTOMER BY AADHAR
app.get('/aadhar/:aadharNumber', async (req, res) => {
  try {
    const list = await customer.find({ aadhaar: req.params.aadharNumber });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET CUSTOMER BY USERNAME
app.get('/username/:username', async (req, res) => {
  try {
    const list = await customer.find({ username: req.params.username });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// FETCH ALL CUSTOMERS WITH ACCOUNTS
app.get('/', async (req, res) => {
  try {
    var cust = await customer.find();
    const services = await consul.catalog.service.nodes('account');
    if (services.length == 0) throw new Error("Account service not registered in consul");

    const accServ = services[0];
    const updatedExperts = await Promise.all(
      cust.map(async (each) => {
        let customer_account = [];
        try {
          const received = await axios.get(`http://${accServ.Address}:${accServ.ServicePort}/userName/${each.username}`);
          customer_account = received.data;
        } catch (error) {
          return res.json({ message: "Error fetching account" });
        }
        // Building new response JSON for each customer
        return { Customer: each, Account: customer_account };
      })
    );
    res.json(updatedExperts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(6000, () => {
  console.log('Customer Service Running on Port 6000!');
});
