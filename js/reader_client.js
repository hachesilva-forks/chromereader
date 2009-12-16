(function($)
{
    window.chromeReader = $.extend(window.chromeReader || { },
    {
        GoogleReaderClient: function(client, baseUrl)
        {
            client = client || 'ChromeReader';
            baseUrl = baseUrl || 'http://www.google.com/reader/';

            function makeUrl(part, type)
            {
                type = type || 'api/0/';
                
                return baseUrl + type + part + 
                       '?client=' + client + 
                       '&ck=' + new Date().valueOf();
            }

            function makeFeedId(feedOrUrl)
            {
                return feedOrUrl.id || ('feed/' + feedOrUrl);
            }

            function makeFeedAtomUrl(feedOrUrl)
            {
                return makeUrl(makeFeedId(feedOrUrl), 'atom/');
            }

            function makeFolderId(folder)
            {
                return 'user/-/label/' + folder;
            }

            function get(options)
            {
                options.type = 'GET';
                options.url = makeUrl(options.url);
                options.dataType = options.dataType || 'json';
                
                $.ajax(options);
            }
            
            function getAtom(feedOrUrl, error, success)
            {
                $.ajax(
                {
                    type: 'GET',
                    dataType: 'xml',

                    error: error,
                    success: success,
                    
                    url: makeFeedAtomUrl(feedOrUrl)
                });
            }
            
            function getSubscriptions(error, success)
            {
                get(
                {
                    url: 'subscription/list',
                    success: success,
                    error: error,
                    data:
                    {
                        output: 'json'
                    }
                });  
            }

            function getTags(error, success)
            {
                get(
                {
                    url: 'tag/list',
                    success: success,
                    error: error,
                    data:
                    {
                        output: 'json'
                    }
                });    
            }
            
            function getToken(error, success)
            {
                get(
                {
                    url: 'token',
                    dataType: 'text',
                    error: error,
                    success: success
                });
            }

            function post(options)
            {
                getToken(options.error, function(token)
                {
                    options.type = 'POST';
                    options.dataType = 'text';
                    options.url = makeUrl(options.url);
                    
                    options.data = options.data || { };            
                    options.data['T'] = token;
                    
                    $.ajax(options);
                });
            }

            function editSubscription(feed, error, success, data)
            {
                data.s = makeFeedId(feed);

                post(
                {
                    url: 'subscription/edit',
                    success: success,
                    error: error,
                    data: data
                });
            }
            
            this.addSubscriptionFolder = function(feed, folder, error, success)
            {
                editSubscription(feed, error, success, 
                {
                    ac: 'edit', a: makeFolderId(folder)
                });
            };

            this.removeSubscriptionFolder = function(feed, folder, error, success)
            {
                editSubscription(feed, error, success, 
                {
                    ac: 'edit', r: makeFolderId(folder)
                });
            };

            this.subscribe = function(feed, error, success)
            {
                editSubscription(feed, error, success,
                {
                    ac: 'subscribe'
                });
            };

            this.unsubscribe = function(feed, error, success)
            {
                editSubscription(feed, error, success,
                {
                    ac: 'unsubscribe'
                });
            };

            this.setTitle = function(feed, title, error, success)
            {
                editSubscription(feed, error, success,
                {
                    ac: 'edit', t: title
                });
            };

            this.getFeedUpdateTime = function(feed, error, success)
            {
                getAtom(feed, error, function(xml)
                {
                    var $updated = $('feed > updated', xml);
                    
                    if ($updated.length > 0)
                    {
                        var dateTime = $updated[0].textContent;
                        var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateTime);
                        
                        if (match)
                        {
                            var result = new Date();
                            
                            var year  = Number(match[1]);
                            var month = Number(match[2]) - 1;
                            var date  = Number(match[3]);
                            
                            result.setUTCFullYear(year);
                            result.setUTCMonth(month);
                            result.setUTCDate(date);
                            
                            success(result);
                        }
                    }
                });
            };

            this.getFolders = function(error, success)
            {
                getTags(error, function(result)
                {
                    var labelRegex = /label\/(.*)$/i
                    var folders = [];
                    
                    for (var i in result.tags)
                    {
                        var tag = result.tags[i];
                        var match = labelRegex.exec(tag.id)
                        
                        if (match && match[1])
                        {
                            folders.push(match[1]);
                        }
                    }
                    
                    success(folders);
                });
            };

            this.getSubscription = function(feeds, error, success)
            {
                getSubscriptions(error, function(result)
                {
                    var feedMap = { };

                    for (var j in feeds)
                    {
                        feedMap[makeFeedId(feeds[j])] = true;
                    }   
                         
                    for (var i in result.subscriptions)
                    {
                        var subscr = result.subscriptions[i];
                        
                        if (feedMap[subscr.id])
                        {
                            success(subscr);
                            return;
                        }
                    }
                    
                    success(null);
                });
            };

            this.ensureSubscribed = function(feeds, error, success)
            {
                var self = this;
                
                self.getSubscription(feeds, error, function(sub)
                {
                    if (sub)
                    {
                        sub.isNew = false;
                        success(sub);
                    }
                    else
                    {
                        self.subscribe(feeds[0], error, function()
                        {
                            self.getSubscription(feeds, error, function(sub)
                            {
                                if (sub)
                                {
                                    sub.isNew = true;
                                }
                                
                                success(sub);
                            });
                        });
                    }            
                });
            };
        }
    });
    
})(jQuery);