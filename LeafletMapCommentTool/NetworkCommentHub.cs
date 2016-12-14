using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using MongoDB.Driver;
using MongoDB.Bson;

namespace LeafletMapCommentTool
{
    [HubName("networkComment")]
    public class NetworkCommentHub : Hub
    {

        public void getMessage()
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var collection = database.GetCollection<BsonDocument>("info");

            var filter = Builders<BsonDocument>.Filter.Eq("type", "greeting");
            var greeting = collection.Find(filter).First();
            filter = Builders<BsonDocument>.Filter.Eq("type", "alert_connect");
            var alert = collection.Find(filter).First();

            this.Clients.Caller.onGetMessage(greeting["message"]);
            this.Clients.Others.onGetMessage(alert["message"]);
        }

        public void newComment()
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");

            this.Clients.Others.onNewComment();
        }

        public void saveComment()
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");

            this.Clients.Others.onSaveComment();
        }

    }
}