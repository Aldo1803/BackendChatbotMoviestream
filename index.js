import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { runQuery } from './db.js';
import OracleDB from 'oracledb';

import Chat from './api/models/Chat.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const uri = `mongodb+srv://aldoparada:${process.env.MONGO_PASSWORD}@moviestream.tmdmkgj.mongodb.net/?retryWrites=true&w=majority`;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected...');
    })
    .catch(err => console.log(err));

const openai = new OpenAI(process.env.OPENAI_API_KEY);


app.post('/createChat', async (req, res) => {
    try {
        const newChat = new Chat();

        const savedChat = await newChat.save();

        res.json(savedChat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/chat/:chatId', async (req, res) => {
    try {
        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId);

        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/chat/:chatId', async (req, res) => {
    try {
        const chatId = req.params.chatId;

        const deletedChat = await Chat.findByIdAndDelete(chatId);

        res.json(deletedChat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/chats', async (req, res) => {
    try {
        const chats = await Chat.find();

        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});








async function getSqlFromGPT(userQuery) {

    const schema = `
        CUSTOMER_SALES_ANALYSIS Schema:
        - MIN_AGE: NUMBER(38)
        - GENRE: VARCHAR2(30 CHAR)
        - AGE_GROUP: VARCHAR2(4000 CHAR)
        - GENDER: VARCHAR2(20 CHAR)
        - APP: VARCHAR2(100 CHAR)
        - DEVICE: VARCHAR2(100 CHAR)
        - OS: VARCHAR2(100 CHAR)
        - PAYMENT_METHOD: VARCHAR2(100 CHAR)
        - LIST_PRICE: NUMBER(38)
        - DISCOUNT_TYPE: VARCHAR2(100 CHAR)
        - DISCOUNT_PERCENT: NUMBER(38)
        - TOTAL_SALES: NUMBER(38)
        - MAX_AGE: NUMBER(38)
        - AGE: NUMBER(38)
        - EDUCATION: VARCHAR2(40 CHAR)
        - INCOME_LEVEL: VARCHAR2(20 CHAR)
        - MARITAL_STATUS: VARCHAR2(8 CHAR)
        - PET: VARCHAR2(40 CHAR)
        - CUST_VALUE: NUMBER
        - CUST_SALES: NUMBER(38)
    `;
    
    const prompt = `${schema}\nTranslate this user query into SQL: "${userQuery}"`

    try {
       

        const response = await openai.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: "gpt-3.5-turbo",
        });

        console.log(response.choices[0].message.content);
        let sqlQuery = response.choices[0].message.content;
        sqlQuery = sqlQuery.replace(/\n/g, ' ');
        // Add validation and sanitization here as necessary
        return sqlQuery;
    } catch (error) {
        console.error('Error querying OpenAI:', error);
        throw error;
    }
}

app.post('/chat/:chatId', async (req, res) => {

    let chatId = req.params.chatId;

    let chatObject = await Chat.findById(chatId)

    

    try {
        const userQuery = await req.body.query; // User's natural language query
        console.log(userQuery);
        chatObject.messages.push(userQuery);
        const sqlQuery = await getSqlFromGPT(userQuery); // Translate to SQL using GPT
        const queryResult = await runQuery(sqlQuery); // Execute SQL query
        chatObject.messages.push(queryResult);

        await Chat.findByIdAndUpdate(chatId, { messages: chatObject.messages });

        res.json({ result: queryResult }); // Send response
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message);
    }
});

app.get('/test-db-connection', async (req, res) => {
    let connection;

    try {
        // Attempt to connect to the Oracle database with mTLS
        connection = await OracleDB.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECTION_STRING,

        });

        res.send('Successfully connected to Oracle Database with mTLS');
    } catch (err) {
        console.error('Error connecting to the database:', err);
        res.status(500).send(`Database connection failed: ${err.message}`);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});