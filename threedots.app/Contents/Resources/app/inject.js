(function() {
    var remote = require("remote");
    var app = remote.require("app");
    var ipc = require("ipc");

    window.electronApp = app;

    var lastNotification = null;
    var HtmlNotification = Notification;
    setInterval(function() {
        // muahaha this line fixes the upload bug
        // it's in setInterval because host may not be available
        host.isExceptionHandlerActive = function() { return true; };
        var session = env.realAppSession();
        var inbox = env.user().domainUserForDomain(session.activeDomain()).inbox();
        var hasNotification = inbox.hasNewNotifications();
        if (hasNotification) {
            app.dock.setBadge("•");
            var lunaNotification = inbox.lastNotificationOrNull();
            if (lunaNotification !== lastNotification) {
                lastNotification = lunaNotification;
                if (lastNotification && !document.hasFocus()) {
                    var title = "Asana";
                    var story = lastNotification.story();
                    if (Date.now() - story.creationTime() < 1000 * 3600 * 2) {
                        var content = story.creator().name() + ": " + story.text();
                        var notification = new HtmlNotification(title, { body: content });
                        notification.onclick = function() {
                            var target = navigationTargetForState({ model: LunaUi.LunaNavigationModel.Inbox });
                            host.wrapInExceptionHandler(
                                "a.meh",
                                ExceptionHandler.ReentryStrategy.FAIL,
                                function() {
                                    processHandler(function() {
                                            session.setInboxModel(target);
                                        });
                                    }
                            )();
                        }
                    }
                }
            }
        } else {
            app.dock.setBadge("");
        }
    }, 1000);

    var isActive = true;
    ipc.on("focus", function () {
        isActive = true;
    });

    ipc.on("blur", function () {
        isActive = false;
    });


    ipc.on("load-task", function(taskId) {
        var session = env.realAppSession();
        host.wrapInExceptionHandler(
            "a.meh",
            ExceptionHandler.ReentryStrategy.FAIL,
            function() {
                processHandler(function() {
                        session.navigateTo(navigationTargetForState({
                            model: LunaUi.LunaNavigationModel.Project,
                            target: new TaskId(taskId + "")
                        }));
                    });
                }
        )();
    });

})();
