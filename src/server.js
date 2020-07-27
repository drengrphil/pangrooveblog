import express from 'express'
import bodyParser from 'body-parser'
import { MongoClient } from 'mongodb'
import path from 'path'

const app = express()

// Tell server where the client side file is located to serve static files
app.use(express.static(path.join(__dirname, '/build')))
app.use(bodyParser.json())
app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next()
})

// Db Setup and tear-down
// Takes function as argument
const withDB = async (operations, res) => {
    try{
        const client = await MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true })
        const db = client.db('pangrooveblog')
        await operations(db)
        client.close()
    } catch (error){
        res.status(500).json({message: 'Error connecting to db', error}) // 500 is for internal server error
    }
}

// Connect to db and get data
app.get('/api/articles/:name', async (req, res) => {
    withDB(async (db) => {
        console.log("Get request received")
        const articleName = req.params.name
        const articlesInfo = await db.collection('articles').findOne({ name: articleName})
        res.status(200).json(articlesInfo)
    }, res)
})

// Vote route or request
app.post('/api/articles/:name/upvote', async (req, res) =>{
    withDB(async (db) => {
        const articleName = req.params.name
        const articleInfo = await db.collection('articles').findOne({ name: articleName})
        await db.collection('articles').updateOne({ name: articleName}, {
            '$set': {
                upvotes: articleInfo.upvotes + 1,
            },
        })
        const updatedArticleInfo = await db.collection('articles').findOne({ name: articleName})
        res.status(200).json(updatedArticleInfo)
    }, res)
})

// Add Comment
app.post('/api/articles/:name/add-comment', (req, res) =>{
    const {username, text} = req.body
    const articleName = req.params.name;
    withDB(async (db) => {
        const articleInfo = await db.collection('articles').findOne({ name: articleName})
        await db.collection('articles').updateOne({ name: articleName}, {
            '$set': {
                comments: articleInfo.comments.concat({ username, text })
            },
        })
        const updatedArticleInfo = await db.collection('articles').findOne({ name : articleName})
        res.status(200).json(updatedArticleInfo)
    }, res)
})

// Any other route call goes to the index of the app.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'))
})

// Start server
app.listen(8003, () => console.log('Listening on port 8003'))