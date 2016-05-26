commons.utils = {

    POST_WITHOUT_COMMENTS_STYLE: 'commons-post-without-comments',
    POST_WITH_COMMENTS_STYLE: 'commons-post-with-comments',
    OGP_IMAGE_REGEX: /og:image" content="([^"]*)"/,
    TWITTER_IMAGE_REGEX: /twitter:image" content="([^"]*)"/,
    OGP_TITLE_REGEX: /og:title" content="([^"]*)"/,
    OGP_DESCRIPTION_REGEX: /og:description" content="([^"&#]*)"/,
    OGP_SITE_NAME_REGEX: /og:site_name" content="([^"]*)"/,

    fromHtml: function (html) {
        return html.replace(/<br>/g, '\n');
    },
    toHtml: function (text) {
        return text.replace(/\r\n|\n|\r/g, '<br>');
    },
    getOGPMarkup: function (url, callback) {

        var self = this;

        $.get('/direct/commons/getUrlMarkup?url=' + url, function (markup) {

            var div = document.createElement('div');

            var title = '';
            var matches = markup.match(self.OGP_TITLE_REGEX);
            if (matches && matches.length == 2) {
                title = matches[1];
                div.innerHTML = title;
                title = $(div).html();
            }


            var image = '';
            var matches = markup.match(self.TWITTER_IMAGE_REGEX);
            if (matches && matches.length == 2) {
                image = matches[1];
            } else {
                matches = markup.match(self.OGP_IMAGE_REGEX);
                if (matches && matches.length == 2) {
                    image = matches[1];
                }
            }

            var description = '';
            var matches = markup.match(self.OGP_DESCRIPTION_REGEX);
            if (matches && matches.length == 2) {
                description = matches[1];
                div.innerHTML = description;
                description = $(div).html();
            }

            var siteName = '';
            var matches = markup.match(self.OGP_SITE_NAME_REGEX);
            if (matches && matches.length == 2) {
                siteName = matches[1];
            }

            if (!title && !image) {
                callback(null);
            } else {
                callback(Handlebars.templates['og_fragment']({title: title,
                                                                image: image,
                                                                url: url,
                                                                description: description,
                                                                siteName: siteName}));
            }
        });
    },
    addHandlersToComment: function (commentId) {

        $('#commons-comment-edit-link-' + commentId).click(commons.utils.editCommentHandler);
        $('#commons-comment-delete-link-' + commentId).click(commons.utils.deleteCommentHandler);
    },
    editPostHandler: function (e) {

        var postId = this.dataset.postId;
        var contentDiv = $('#commons-post-content-' + postId);
        commons.utils.oldContent = contentDiv.html();
        contentDiv.prop('contenteditable', true).focus();
        var postEditButtons = $('#commons-post-edit-buttons-'+ postId);
        postEditButtons.show();

        $(document).ready(function () {

            $('#commons-inplace-post-editor-post-button-' + postId).off('click').click(function (e) {

                commons.utils.savePost(postId, contentDiv.html(), function () {

                        contentDiv.prop('contenteditable', false);
                        $('#commons-post-options-' + postId).show();
                        postEditButtons.hide();
                    });
                });
        });
        $('#commons-post-options-' + postId).hide();
    },
    deletePostHandler: function (e) {

        var postId = this.dataset.postId;
        commons.utils.deletePost(postId, function () {
                $('#commons-post-' + postId).remove();
            });
    },
    cancelPostEdit: function (postId) {

        var contentDiv = $('#commons-post-content-' + postId);
        contentDiv.html(this.oldContent);
        contentDiv.prop('contenteditable', false);
        $('#commons-post-options-' + postId).show();
        $('#commons-post-edit-buttons-'+ postId).hide();
    },
    editCommentHandler: function (e) {

        // Get the comment id from the link
        var commentId = this.dataset.commentId;

        var container = $('#commons-comment-' + commentId);

        var contentSpan = $('#commons-comment-content-' + commentId);

        var postId = container.data('post-id');

        // Comment metadata is attached to the container
        var comment = {
                id: commentId,
                postId: postId,
                creatorId: container.data('creator-id'),
                creatorDisplayName: container.data('creator-display-name'),
                createdDate: container.data('created-date'),
                modifiedDate: container.data('modified-date'),
                content: contentSpan.html(),
            };

        commons.utils.addPermissionsToComment(comment);

        commons.utils.commentBeingEdited = comment;
        commons.utils.renderTemplate('inplace_comment_editor', comment, 'commons-comment-' + commentId);

        $(document).ready(function () {

            var textarea = $('#commons-comment-textarea-' + comment.id);
            var tmp = commons.utils.fromHtml(comment.content);
            console.log(tmp);
            textarea.val(commons.utils.fromHtml(comment.content));
            textarea.each(function () { autosize(this); }).focus();

            $('#commons-inplace-comment-editor-cancel-button-' + comment.id).click(function (e) {

                commons.utils.renderTemplate(
                    'comment', commons.utils.commentBeingEdited, 'commons-comment-' + commentId);
                $('#commons-comment-edit-link-' + commentId).click(commons.utils.editCommentHandler);
            });

            $('#commons-inplace-comment-editor-post-button-' + commentId).click(function (e) {

                commons.utils.saveComment(commentId, postId, textarea.val(), function (savedComment) {

                        textarea.val('');
                        $('#commons-comments-' + postId).show();
                        commons.utils.addPermissionsToComment(savedComment);
                        commons.utils.renderTemplate('comment', savedComment, 'commons-comment-' + savedComment.id);
                        commons.utils.addHandlersToComment(commentId);
                    });
            });
        });
    },
    deleteCommentHandler: function (e) {

        if (!confirm(commons.i18n.delete_comment_message)) {
            return false;
        }

        var commentId = this.dataset.commentId;
        var postId = this.dataset.postId;
        var numComments = $('#commons-comments-' + postId + ' .commons-comment').length;
        if (numComments <= 2) {
            $('#commons-hide-comments-link-' + postId).hide();
            $('#commons-show-comments-link-' + postId).hide();
        }
        var commentToDelete = $('#commons-comment-' + commentId);

        if (commentToDelete.hasClass('commons-comment-latest')) {
            commentToDelete.prev().removeClass('commons-comment-not-latest').addClass('commons-comment-latest').show();
        }
        commons.utils.deleteComment(commentId, function () {
                commentToDelete.remove();
            });
    },
    cancelCommentEdit: function (commentId) {

        commons.utils.renderTemplate('comment', commons.utils.commentBeingEdited, 'commons-comment-' + commentId);
        $('#commons-comment-edit-link-' + commentId).click(commons.utils.editCommentHandler);
    },
    getCurrentUserPermissions: function (callback) {

        $.ajax( {
            url: '/direct/commons/userPerms.json?siteId=' + commons.siteId + '&embedder=' + commons.embedder,
            dataType: 'json',
            cache: false,
            timeout: commons.AJAX_TIMEOUT
        }).done(function (json) {
            callback(json.data);
        }).fail(function (xmlHttpRequest, textStatus, error) {
            alert('Failed to get the current user permissions. Status: ' + textStatus + '. Error: ' + error);
        });
    },
    getSitePermissionMatrix: function (callback) {

        $.ajax( {
            url: '/direct/commons/perms.json?siteId=' + commons.siteId,
            dataType: 'json',
            cache: false,
            timeout: commons.AJAX_TIMEOUT
        }).done(function(json) {

            var p = json.data;

            var perms = [];

            for (role in p) {
                var permSet = {'role': role};

                p[role].forEach(function (p) {
                    eval('permSet.' + p.replace(/\./g,'_') + ' = true');
                });

                perms.push(permSet);
            }

            callback(perms);
        }).fail(function(xmlHttpRequest, textStatus, error) {
            alert("Failed to get permissions. Status: " + textStatus + ". Error: " + error);
        });
    },
    savePermissions: function () {

        var myData = { siteId: commons.siteId };
        $('.commons-permission-checkbox').each(function (b) {

            if (this.checked) {
                myData[this.id] = 'true';
            } else {
                myData[this.id] = 'false';
            }
        });

        $.ajax( {
            url: "/direct/commons/savePermissions",
            type: 'POST',
            data: myData,
            dataType: 'text',
            timeout: commons.AJAX_TIMEOUT
        }).done(function (result) {
            location.reload();
        }).fail(function(xmlHttpRequest, textStatus, error) {
            alert("Failed to save permissions. Status: " + textStatus + '. Error: ' + error);
        });

        return false;
    },
    attachProfilePopup: function () {

        $('a.profile').cluetip({
            width: '620px',
            cluetipClass: 'commons',
            sticky: true,
            dropShadow: false,
            arrows: true,
            mouseOutClose: true,
            closeText: '<img src="/library/image/silk/cross.png" alt="close" />',
            closePosition: 'top',
            showTitle: false,
            hoverIntent: true
        });
    },
    formatDate: function (millis) {

        if (millis <= 0) {
            return commons.i18n.none;
        } else {
            var d = new Date(millis);
            var hours = d.getHours();
            if (hours < 10) hours = '0' + hours;
            var minutes = d.getMinutes();
            if (minutes < 10) minutes = '0' + minutes;
            return d.getDate() + " " + commons.i18n.months[d.getMonth()] + " " + d.getFullYear() + " @ " + hours + ":" + minutes;
        }
    },
    addFormattedDatesToPosts: function (posts) {

        posts.forEach(function (p) {
            commons.utils.addFormattedDateToPost(p);
        });
    },
    addFormattedDateToPost: function (post) {

        post.formattedCreatedDate = this.formatDate(post.createdDate);
        post.formattedModifiedDate = this.formatDate(post.modifiedDate);

        post.comments.forEach(function (c, index) {

            if (index < (post.comments.length - 1)) {
                c.orderClass = 'commons-comment-not-latest';
            } else {
                c.orderClass = 'commons-comment-latest';
                c.isLatest = true;
            }
            c.formattedCreatedDate = commons.utils.formatDate(c.createdDate);
            c.formattedModifiedDate = commons.utils.formatDate(c.modifiedDate);
        });
    },
    addFormattedDatesToCurrentPost: function () {
        this.addFormattedDateToPost(commons.currentPost);
    },
    savePost: function (postId, content, callback) {

        var success = false;

        if (!postId) postId = '';

        if ('' == content) {
            alert(commons.i18n.no_content_warning);
            return 0;
        }

        //content = commons.utils.toHtml(content);

        var post = {
                'id': postId,
                'content': content,
                'commonsId': commons.commonsId,
                'siteId': commons.siteId,
                'embedder': commons.embedder
            };
                
        $.ajax({
            url: '/direct/commons/savePost.json',
            type: 'POST',
            data: post,
            timeout: commons.AJAX_TIMEOUT
        }).done(function (data) {
            callback(data);
        }).fail(function(xmlHttpRequest, textStatus, error) {
                alert("Failed to store post. Status: " + textStatus + '. Error: ' + error);
        });
    },
    saveComment: function (commentId, postId, content, callback) {

        content = commons.utils.toHtml(content);

        var comment = {
                'id': commentId,
                'postId': postId,
                'content': content,
                'commonsId': commons.commonsId,
                'siteId': commons.siteId,
                'embedder': commons.embedder
            };

        $.ajax( {
            url: "/direct/commons/saveComment.json",
            type: 'POST',
            data: comment,
            timeout: commons.AJAX_TIMEOUT
        }).done(function (comment) {
            callback(comment);
        }).fail(function (xmlHttpRequest, textStatus, error) {
            alert("Failed to save comment. Status: " + textStatus + '. Error: ' + error);
        });

        return false;
    },
    deleteComment: function (commentId, callback) {
        
        $.ajax( {
            url: '/direct/commons/deleteComment?commonsId=' + commons.commonsId + '&commentId=' + commentId,
            timeout: commons.AJAX_TIMEOUT
        }).done(function (text, status) {
            callback();
        }).fail(function (xmlHttpRequest, textStatus, error) {
            alert("Failed to delete comment. Status: " + textStatus + ". Error: " + error);
        });
        
        return false;
    },
    deletePost: function (postId, callback) {
                        
        if (!confirm(commons.i18n.delete_post_message)) {
            return false;
        }
        
        $.ajax({
            url: '/direct/commons/deletePost?postId=' + postId,
            timeout: commons.AJAX_TIMEOUT
        }).done(function (text, status) {
            callback();
        }).fail(function (xmlHttpRequest, textStatus, error) {
            alert("Failed to delete post. Status: " + textStatus + ". Error: " + error);
        });
        
        return false;
    },
    addPermissionsToPost: function (p) {

        p.currentUserId = commons.userId;

        p.canComment = commons.currentUserPermissions.commentCreate;
        p.canDelete = commons.currentUserPermissions.postDeleteAny
                        || (commons.currentUserPermissions.postDeleteOwn && p.creatorId === commons.userId);
        p.canEdit = commons.currentUserPermissions.postUpdateAny
                        || (commons.currentUserPermissions.postUpdateOwn && p.creatorId === commons.userId);
        p.isModified = p.modifiedDate > p.createdDate;

        p.comments.forEach(function (c) { commons.utils.addPermissionsToComment(c); });
    },
    addPermissionsToComment: function (c) {

        c.canComment = commons.currentUserPermissions.commentCreate;
        c.modified = c.modifiedDate > c.createdDate;
        c.canDelete = commons.currentUserPermissions.commentDeleteAny
                        || (commons.currentUserPermissions.commentDeleteOwn && c.creatorId === commons.userId);
        c.canEdit = commons.currentUserPermissions.commentUpdateAny
                        || (commons.currentUserPermissions.commentUpdateOwn && c.creatorId === commons.userId);
    },
    renderTemplate: function (name, data, output) {

        var template = Handlebars.templates[name];
        document.getElementById(output).innerHTML = template(data);
    },
    renderPost: function (post, output) {

        this.addPermissionsToPost(post);
        post.currentUserId = commons.userId;

        this.renderTemplate('post', post, output);

        var self = this;

        $(document).ready(function () {

            $('#commons-post-edit-link-' + post.id).click(self.editPostHandler);
            $('#commons-post-delete-link-' + post.id).click(self.deletePostHandler);
            var textarea = $('#commons-comment-textarea-' + post.id);
            textarea.each(function () { autosize(this); });
            var creator = $('#commons-comment-creator-' + post.id);
            var commentLink = $('#commons-create-comment-link-' + post.id);
            commentLink.click(function (e) {

                creator.show();
                textarea.focus();
                commentLink.hide();
            });
            $('#commons-inplace-comment-editor-cancel-button-' + post.id).click(function (e) {

                creator.hide();
                commentLink.show();
            });

            var showCommentsLink = $('#commons-show-comments-link-' + post.id);
            var hideCommentsLink = $('#commons-hide-comments-link-' + post.id);
            showCommentsLink.click(function (e) {

                $('#commons-comments-' + post.id + ' .commons-comment-not-latest').show();
                showCommentsLink.hide();
                hideCommentsLink.show();
            });
            hideCommentsLink.click(function (e) {

                $('#commons-comments-' + post.id + ' .commons-comment-not-latest').hide();
                hideCommentsLink.hide();
                showCommentsLink.show();
            });

            $('#commons-inplace-comment-editor-post-button-' + post.id).click(function (e) {

                commons.utils.saveComment('', post.id, textarea.val(), function (savedComment) {

                        textarea.val('');

                        var commentId = savedComment.id;
                    
                        creator.hide();
                        commentLink.show();

                        var numComments = $('#commons-comments-' + post.id + ' .commons-comment').length;

                        if (numComments > 0) {
                            var latestComment = $('#commons-comments-' + post.id + ' .commons-comment-latest');
                            latestComment.removeClass('commons-comment-latest')
                                            .addClass('commons-comment-not-latest');
                            if (numComments == 1 || showCommentsLink.is(':visible')) {
                                latestComment.hide();
                                showCommentsLink.show();
                            }
                        }

                        commons.utils.addPermissionsToComment(savedComment);
                        savedComment.formattedCreatedDate = commons.utils.formatDate(savedComment.createdDate);
                        savedComment.orderClass = 'commons-comment-latest';
                        savedComment.isLatest = true;
                        var wrappedComment = Handlebars.templates['wrapped_comment'] (savedComment);
                        $('#commons-comments-container-' + post.id).append(wrappedComment);

                        self.addHandlersToComment(commentId);
                    });
            });

            if (post.comments.length <= 1) {
                showCommentsLink.hide();
            }

            var comments = $('#commons-comments-' + post.id);
            comments.find('.commons-comment-edit-link').click(commons.utils.editCommentHandler);
            comments.find('.commons-comment-delete-link').click(commons.utils.deleteCommentHandler);
        });
    },
    renderPageOfPosts: function (all) {

        var self = this;

        var loadImage = $('#commons-loading-image')
        loadImage.show();

        var url = '/direct/commons/posts/' + commons.commonsId + '.json?siteId='
                        + commons.siteId + '&embedder=' + commons.embedder + '&page=';
        url += (all) ? '-1' : commons.page;

        $.ajax( { url : url, dataType: "json", cache: false, timeout: commons.AJAX_TIMEOUT })
            .done(function (data) {

                if (data.status === 'END') {
                    commons.scrollable.off('scroll.commons');
                    loadImage.hide();
                } else {
                    commons.scrollable.off('scroll.commons').on('scroll.commons', commons.utils.getScrollFunction(commons.utils.renderPageOfPosts));
                }

                commons.postsTotal = data.postsTotal;
                var posts = data.posts;

                commons.currentPosts = commons.currentPosts.concat(posts);

                if (commons.page == 0 && data.postsTotal > 0) {
                    $('#commons-body-toggle').show();
                }

                commons.postsRendered += posts.length;

                commons.utils.addFormattedDatesToPosts(posts);

                // Add the next batch of placeholders to the post list
                var t = Handlebars.templates['posts_placeholders'];
                $('#commons-posts').append(t({ posts: posts }));

                $(document).ready(function () {

                    // Now render them into their placeholders
                    posts.forEach(function (p) { commons.utils.renderPost(p, 'commons-post-' + p.id); });

                    loadImage.hide();
                    try {
                        if (window.frameElement) {
                            setMainFrameHeight(window.frameElement.id);
                        }
                    } catch (err) {
                        // This is likely under an LTI provision scenario.
                        // XSS protection will block this call.
                    }
                });
                commons.page += 1;
            }).fail(function (xmlHttpRequest, textStatus, errorThrown) {
                alert("Failed to get posts. Reason: " + errorThrown);
            });
    },
    getScrollFunction: function (callback) {

        var scroller = function () {
            
            //var win = $(window);
            var wintop = commons.scrollable.scrollTop();
            var winheight = commons.scrollable.height();
            var docheight = commons.doc.height()

            if  ((wintop/(docheight-winheight)) > 0.95 || $('body').data('scroll-commons') === true) {
                $('body').data('scroll-commons', false);
                commons.scrollable.off('scroll.commons');
                callback();
            }
        };

        return scroller;
    },
    placeCaretAtEnd: function (el) {

        el.focus();
        if (typeof window.getSelection != "undefined"
                && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
    }
};
