using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;

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

            foreach (PropertyDescriptor descriptor in TypeDescriptor.GetProperties(comment))
            {
                string name = descriptor.Name;
                object value = descriptor.GetValue(comment);
                System.Diagnostics.Debug.WriteLine("{0}={1}", name, value);
            }

            var newComment = new BsonDocument {
                { "id", comment.Id },
                { "name", comment.Name },
                { "drawing", new BsonDocument {
                    { "dataUrl", comment.Sketch.DataUrl },
                    { "bounds", new BsonDocument {
                        {"northEast", new BsonDocument {
                            {"lat", comment.Sketch.SketchBounds.NorthEast.Lat },
                            {"lng", comment.Sketch.SketchBounds.NorthEast.Lng }
                        }},
                        {"southWest", new BsonDocument {
                            {"lat", comment.Sketch.SketchBounds.SouthWest.Lat },
                            {"lng", comment.Sketch.SketchBounds.SouthWest.Lng }
                        }
                        }
                    }
                    }
                }
                },
                { "zoomLevel", comment.ZoomLevel }

            };

            collection.InsertOne(newComment);

            this.Clients.Others.onNewComment(comment);
        }

        public void saveComment(Comment comment)
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var collection = database.GetCollection<BsonDocument>("comments");
            var filter = Builders<BsonDocument>.Filter.Eq("id", comment.Id);

            // remove old version of the comment ( I don't really want to deal with updating right now )
            collection.DeleteMany(filter);

            // insert new version of the comment
            var updatedComment = new BsonDocument {
                { "id", comment.Id },
                { "name", comment.Name },
                { "drawing", new BsonDocument {
                    { "dataUrl", comment.Sketch.DataUrl },
                    { "bounds", new BsonDocument {
                        {"northEast", new BsonDocument {
                            {"lat", comment.Sketch.SketchBounds.NorthEast.Lat },
                            {"lng", comment.Sketch.SketchBounds.NorthEast.Lng }
                        }},
                        {"southWest", new BsonDocument {
                            {"lat", comment.Sketch.SketchBounds.SouthWest.Lat },
                            {"lng", comment.Sketch.SketchBounds.SouthWest.Lng }
                        }
                        }
                    }
                    }
                }
                },
                { "zoomLevel", comment.ZoomLevel }
            };

            var textAnnotations = new BsonArray();
            foreach (var text in comment.TextAnnotations)
            {
                textAnnotations.Add(new BsonDocument
                {
                    { "textDrawing", new BsonDocument {
                        { "dataUrl", text.TextSketch.DataUrl },
                        { "bounds", new BsonDocument {
                            {"northEast", new BsonDocument {
                                {"lat", text.TextSketch.SketchBounds.NorthEast.Lat },
                                {"lng", text.TextSketch.SketchBounds.NorthEast.Lng }
                            }},   
                            {"southWest", new BsonDocument {
                                {"lat", text.TextSketch.SketchBounds.SouthWest.Lat },
                                {"lng", text.TextSketch.SketchBounds.SouthWest.Lng }
                            }}
                        }},
                        { "textId", text.TextId}
                    }},
                    { "textId", text.TextId },
                    { "latlng", new BsonDocument {
                        {"lat", text.textLatLng.Lat },
                        {"lng", text.textLatLng.Lng }
                    }},
                    { "textVal", text.TextVal },
                    { "textZoomLevel", text.textZoomLevel }
                }); // I hate curly braces...
            }
            // insert all the annotations into the comment and then insert into mongo
            updatedComment.Add("textAnnotations", textAnnotations);

            collection.InsertOne(updatedComment);

            this.Clients.Others.onSaveComment(comment);
        }

        public void editCommentStart(Comment comment)
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var collection = database.GetCollection<BsonDocument>("beingEdited");
            var projection = Builders<BsonDocument>.Projection.Exclude("_id");

            // insert into beignEdited
            var editComment = new BsonDocument {
                { "id", comment.Id },
            };

            collection.InsertOne(editComment);

            var editList = collection.Find(new BsonDocument()).Project(projection).ToList();
            
            // update the edit list for all
            this.Clients.All.onUpdateEditList(editList);

        }

        public void editCommentEnd(Comment comment)
        {
            System.Diagnostics.Debug.WriteLine("remove a comment from beingEdited");

            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var collection = database.GetCollection<BsonDocument>("beingEdited");
            var filter = Builders<BsonDocument>.Filter.Eq("id", comment.Id);
            var projection = Builders<BsonDocument>.Projection.Exclude("_id");

            collection.DeleteMany(filter);

            var editList = collection.Find(new BsonDocument()).Project(projection).ToList();

            // update the edit list for all
            this.Clients.All.onUpdateEditList(editList);
        }


        public void initialLoad()
        {
            var client = new MongoClient();
            var database = client.GetDatabase("MapCommentToolSignalR");
            var beingEdited = database.GetCollection<BsonDocument>("beingEdited");
            var comments = database.GetCollection<BsonDocument>("comments");
            var projection = Builders<BsonDocument>.Projection.Exclude("_id");

            var editList = beingEdited.Find(new BsonDocument()).Project(projection).ToList();
            var commentsList = comments.Find(new BsonDocument()).Project(projection).ToList();

            // update the edit list for all
            this.Clients.All.onInitialLoad(editList.ToJson(), commentsList.ToJson());
        }

    
    }

    public class Comment
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("drawing")]
        public Drawing Sketch { get; set; }
     
        [JsonProperty("zoomLevel")]
        public int ZoomLevel { get; set; }

        [JsonProperty("textAnnotations")]
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
        [JsonProperty("northEast")]
        public LatLng NorthEast { get; set; }

        [JsonProperty("southWest")]
        public LatLng SouthWest { get; set; }
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