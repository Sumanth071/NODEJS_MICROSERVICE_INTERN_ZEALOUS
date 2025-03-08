const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('./db');
const BankAccount = require('./accountSchema');
const Consul = require('consul');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const consul = new Consul();
const serviceKey = "account";

// Register service with Consul
consul.agent.service.register(
    {
        id: serviceKey,
        name: serviceKey,
        address: "localhost",
        port: 6050,
    },
    (err) => {
        if (err) {
            console.error('Error registering service with Consul:', err.message);
            process.exit(1); // Exit if service registration fails
        }
        console.log('Account Service successfully registered');
    }
);

// Deregister service on process exit
process.on("SIGINT", async () => {
    try {
        await consul.agent.service.deregister(serviceKey);
        console.log("Account service deregistered");
        process.exit();
    } catch (err) {
        console.error("Error during service deregistration:", err.message);
        process.exit(1);
    }
});

// Add a new bank account
app.post('/account', async (req, res) => {
    try {
        const { username, accountNumber, accountBalance, accountStatus } = req.body;
        const obj = new BankAccount({ username, accountNumber, accountBalance, accountStatus });
        const result = await obj.save();
        res.status(201).json({ message: "Account Created", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all bank accounts
app.get('/account', async (req, res) => {
    try {
        const accounts = await BankAccount.find();
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bank account by ID
app.get('/account/:id', async (req, res) => {
    try {
        const account = await BankAccount.findById(req.params.id);
        if (!account) return res.status(404).json({ message: "Account not found" });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update bank account by ID
app.put('/account/:id', async (req, res) => {
    try {
        const updatedAccount = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedAccount) return res.status(404).json({ message: "Account not found" });
        res.json({ message: "Account Updated", updatedAccount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete bank account by ID
app.delete('/account/:id', async (req, res) => {
    try {
        const deletedAccount = await BankAccount.findByIdAndDelete(req.params.id);
        if (!deletedAccount) return res.status(404).json({ message: "Account not found" });
        res.json({ message: "Account Deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get account by account number
app.get('/accountNumber/:acc_no', async (req, res) => {
    try {
        const account = await BankAccount.findOne({ accountNumber: req.params.acc_no });
        if (!account) return res.status(404).json({ message: "Account not found" });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get accounts by username
app.get('/username/:username', async (req, res) => {
    try {
        const accounts = await BankAccount.find({ username: req.params.username });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/accounts-with-transactions', async (req, res) => {
    try {
        // Fetch all accounts from the database
        const accounts = await BankAccount.find();

        // Query Consul for the transaction service nodes
        const services = await new Promise((resolve, reject) => {
            consul.catalog.service.nodes('transaction', (err, result) => {
                if (err) {
                    console.error("Error querying Consul:", err.message);
                    return reject(err);
                }
                resolve(result);
            });
        });

        // Ensure the services array is valid
        if (!services || services.length === 0) {
            return res.status(500).json({ error: "Transaction service not registered in Consul" });
        }

        // Get the first transaction service node
        const transactionService = services[0];

        // Map accounts to include their transactions
        const updatedAccounts = await Promise.all(
            accounts.map(async (account) => {
                let transactions = [];
                try {
                    const response = await axios.get(
                        `http://${transactionService.Address}:${transactionService.ServicePort}/accountNumber/${account.accountNumber}`
                    );
                    transactions = response.data; // Transactions from the service
                } catch (error) {
                    console.error(
                        `Error fetching transactions for account ${account.accountNumber}:`,
                        error.message
                    );
                }
                return { account, transactions };
            })
        );

        // Respond with accounts and transactions
        res.json(updatedAccounts);
    } catch (error) {
        console.error("Error in /accounts-with-transactions route:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(6050, () => {
    console.log('Account Service Running on port 6050');
});
