using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using MongoDB.Driver;
using MongoDB.Bson;
using Newtonsoft.Json;
using System.Collections;

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

        public void newComment(Comment comment)
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var collection = database.GetCollection<BsonDocument>("comments");

            var newComment = new BsonDocument
            {
                { "id", comment.Id },
                { "name", comment.Name },
            };

            collection.InsertOne(newComment);

            this.Clients.Others.onNewComment();
        }

        public void saveComment()
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");

            this.Clients.Others.onSaveComment();
        }

    }
    
    public class Comment
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        public Drawing Sketch { get; set; }

        public List<TextAnnotation> TextAnnotations { get; set; }
    }

    public class Drawing
    {
        [JsonProperty("dataUrl")]
        public string DataUrl { get; set; }

        [JsonProperty("bounds")]
        public Bounds SketchBounds { get; set; }
    }

    public class Bounds
    {
        [JsonProperty("northWest")]
        public LatLng NorthWest { get; set; }

        [JsonProperty("southEast")]
        public LatLng SouthEast { get; set; }
    }

    public class LatLng
    {
        [JsonProperty("lat")]
        public float Lat { get; set; }

        [JsonProperty("lng")]
        public float Lng { get; set; }
    }

    public class TextAnnotation
    {
        [JsonProperty("textDrawing")]
        public TextDrawing TextSketch { get; set; }

        [JsonProperty("textId")]
        public String TextId { get; set; }

        [JsonProperty("latlng")]
        public LatLng textLatLng { get; set; }
        
        [JsonProperty("textVal")]
        public String TextVal { get; set; }
        
        [JsonProperty("textZoomLevel")]
        public int textZoomLevel { get; set; }
    }

    public class TextDrawing
    {
        [JsonProperty("dataUrl")]
        public string DataUrl { get; set; }

        [JsonProperty("bounds")]
        public Bounds SketchBounds { get; set; }

        [JsonProperty("textId")]
        public String TextId { get; set; }
    }


}