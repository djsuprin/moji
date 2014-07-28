JiraMobile.addModule('issue', (function () {

	var settings   = JiraMobile.getModule('settings'),
		utils      = JiraMobile.getModule('utils'),

        currentIssueKey,

		ISSUE_LINK = '/rest/api/latest/issue/';

    $(function() {
        $('#issue-new-comment-form a').tap(function(e) {
            e.preventDefault();
            addComment();
        });
    });


    function showIssue() {
        // if issue key is set as URL parameter take its value otherwise look up in localStorage
        var hashIssueKey = window.location.hash.split("?");
        if (hashIssueKey.length > 1) {
            currentIssueKey = hashIssueKey[1];
        } else {
            currentIssueKey = localStorage['currentIssueKey'];
        }
        
        $('#issue').find('#issue-page-title').html(currentIssueKey);
        if (typeof localStorage[currentIssueKey] !== 'undefined') {
            displayIssue(JSON.parse(localStorage[currentIssueKey]));
            return;
        }
        utils.showNotification();
        (function(currentIssueKey) {
            $.ajax({
                type: "GET",
                url: settings.getJiraLink() + ISSUE_LINK + currentIssueKey,
                dataType: 'json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', settings.getAuthHeaderValue());
                },
                success: [function (data) {
                    localStorage.setItem(currentIssueKey, JSON.stringify(data));
                }, displayIssue],
                error: function (data) {
                    console.log('Error while retrieving issue info.');
                    console.log(data);
                },
                complete: function (data) {
                    utils.hideNotification();
                }
            });
        })(currentIssueKey);
    }

    function displayIssue(data) {
        var issueFields = data['fields'];
        var issue = {
            description: issueFields['description'] !== null ? issueFields['description'] : 'No description',
            resolution: (issueFields['resolution'] !== undefined && issueFields['resolution'] !== null) ? 
                    issueFields['resolution']['name'] : 'Unresolved',
            created: new Date(issueFields['created']).toLocaleString(),
            updated: new Date(issueFields['updated']).toLocaleString(),
            duedate: new Date(issueFields['duedate']).toLocaleString()
        }

        var commentData = issueFields['comment'];
        if (commentData.total > 0) {
            var commentsArray = commentData['comments'];
            var templateData = { comments : [] };
            var comment, author;
            for (var i = commentData['startAt']; i < commentData['maxResults']; i++) {
                author = commentsArray[i]['author'];
                comment = {
                    avatar: author['avatarUrls']['48x48'],
                    author: author['displayName'],
                    created: new Date(commentsArray[i]['created']).toLocaleString(),
                    updated: new Date(commentsArray[i]['updated']).toLocaleString(),
                    comment: utils.wiki2html(commentsArray[i]['body'])
                }
                templateData.comments.push(comment);
            }
            var commentsListHtml = Mustache.to_html($('#issue-comments-tpl').html(), templateData);
            $('#issue-comments-container').html(commentsListHtml);
            for (var i = 0; i < templateData.comments.length; i++) {
                $($('.issue-comment-body').get(i)).html(templateData.comments[i]['comment']);
            }
            $('#issue-comments').listview();
        } else {
            $('#issue-comments-container').html('<p>No comments</p>');
        }

        $('#issue-summary').html(issueFields['summary']);
        $('#issue-type').html(issueFields['issuetype']['name']);
        $('#issue-status').html(issueFields['status']['name']);
        $('#issue-resolution').html(issue['resolution']);
        $('#issue-priority').html(issueFields['priority']['name']);
        $('#issue-assignee').html(issueFields['assignee']['displayName']);
        $('#issue-reporter').html(issueFields['reporter']['displayName']);

        createButtonsFromArray(issueFields['versions'], '#issue-affects-versions');
        createButtonsFromArray(issueFields['fixVersions'], '#issue-fix-versions');
        createButtonsFromArray(issueFields['components'], '#issue-components');
        createButtonsFromArray(issueFields['labels'], '#issue-labels');

        $('#issue-description').html(utils.wiki2html(issue['description']));
        $('#issue-created').html(issue['created']);
        $('#issue-updated').html(issue['updated']);
        $('#issue-due-date').html(issue['duedate']);
        $('#issue-estimated').html(issueFields['timetracking']['originalEstimate']);
        $('#issue-remaining').html(issueFields['timetracking']['remainingEstimate']);
        $('#issue-logged').html(issueFields['timetracking']['timeSpent']);
    }

    function createButtonsFromArray(elements, placeholderSelector) {
        if (typeof elements !== 'undefined' && elements !== null && elements.length > 0) {
            var $div = $('<div/>');
            for (var i = 0; i < elements.length; i++) {
            var name = (typeof elements[i] == 'string' || elements[i] instanceof String) ? elements[i] : elements[i]['name'];
            var $button = $('<a/>').attr({
                'data-role': 'button',
                'data-inline': true,
                'data-mini': true,
                'href': '#'
            }).html(name).tap(function (e) {
                e.preventDefault();
            }).taphold(function(e) {
                console.log("edit");
                e.preventDefault();
            }).addClass('ui-btn ui-btn-inline ui-mini');
            $div.append($button);
            }
            $(placeholderSelector).html($div);
        } else {
            $(placeholderSelector).html('None');
        }
    }

    function displayNewComment(data) {
        console.log("New comment:");
        console.log(data);
        /*$newComment = $('<li/>').
        var $issueCommentsList = $('#issue-comments');
        $issueCommentsList.append($newComment);
        $issueCommentsList.listview('refresh');*/
    }

    function addComment() {
        console.log('Adding new comment');
        var commentBody = $('#issue-new-comment-form textarea').val();
        utils.showNotification();
        $.ajax({
            type: "POST",
            url: settings.getJiraLink() + ISSUE_LINK + currentIssueKey + '/comment',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: { body: commentBody },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('Authorization', settings.getAuthHeaderValue());
            },
            success: displayNewComment,
            error: function (data) {
                console.log('Error while adding new comment.');
                console.log(data);
            },
            complete: function (data) {
                utils.hideNotification();
            }
        });
    }

	return {
	    showIssue: showIssue,
        addComment: addComment
	};
})());