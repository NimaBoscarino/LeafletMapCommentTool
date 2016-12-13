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
        private static String message = "Ping!!";

        public void getMessage()
        {
            this.Clients.Caller.onGetMessage(message);
        }

        public void newComment()
        {
            this.Clients.Others.onNewComment();
        }

        public void saveComment()
        {
            this.Clients.Others.onSaveComment();
        }

    }
}