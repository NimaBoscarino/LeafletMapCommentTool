using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using Microsoft.AspNet.SignalR.Hubs;

namespace LeafletMapCommentTool
{
    [HubName("networkComment")]
    public class NetworkCommentHub : Hub
    {
        private static String message = "Hey there";

        public void getMessage()
        {
            this.Clients.All.onGetMessage(message);
        }
    }
}