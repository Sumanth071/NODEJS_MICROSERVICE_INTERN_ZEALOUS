const express = require('express');
const bodyParser = require('body-parser');
const Transaction = require('./transactionSchema');
const mongoose = require('./db');
const Consul = require('consul');

const app = express();
app.use(bodyParser.json());

const consul = new Consul();
const serviceKey = "transaction";

// REGISTERING TRANSACTION SERVICE TO DISCOVERY SERVER
consul.agent.service.register({
    id: serviceKey,
    name: serviceKey,
    address: "localhost",
    port: 7000
}, (err) => {
    if (err) throw err;
    console.log('Transaction Service successfully registered');
});

// DEREGISTER SERVICE ON PROCESS EXIT
process.on("SIGINT", async () => {
    consul.agent.service.deregister(serviceKey, () => {
        console.log("Transaction service deregistered");
        process.exit();
    });
});

// ADD NEW TRANSACTION
app.post('/', async (req, res) => {
    try {
        const transaction = new Transaction(req.body);
        await transaction.save();
        res.json({ message: "Transaction Created", transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET ALL TRANSACTIONS
app.get('/', async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET TRANSACTION BY ID
app.get('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET TRANSACTION BY TRANSACTION ID
app.get('/transaction/:transactionId', async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ transactionId: req.params.transactionId });
        if (!transaction) return res.status(404).json({ message: "Transaction not found" });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// UPDATE TRANSACTION BY ID
app.put('/:id', async (req, res) => {
    try {
        const updatedTransaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTransaction) return res.status(404).json({ message: "Transaction not found" });
        res.json({ message: "Transaction Updated", updatedTransaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE TRANSACTION BY ID
app.delete('/:id', async (req, res) => {
    try {
        const deletedTransaction = await Transaction.findByIdAndDelete(req.params.id);
        if (!deletedTransaction) return res.status(404).json({ message: "Transaction not found" });
        res.json({ message: "Transaction Deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET TRANSACTION BY TRANSACTION FROM
app.get('/transactionFrom/:transactionFrom', async (req, res) => {
    try {
        const list = await Transaction.find({ transactionFrom: req.params.transactionFrom });
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(7000, () => {
    console.log("Transaction Service Running on 7000");
});
