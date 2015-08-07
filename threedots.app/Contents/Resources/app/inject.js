(function() {
    var remote = require("remote");
    var app = remote.require("app");
    window.electronApp = app;

    var lastNotification = null;
    var HtmlNotification = Notification;
    setInterval(function() {
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

    window.isActive = false;
    app.on("browser-window-focus", function () {
        window.isActive = true;
    });

    app.on("browser-window-blur", function () {
        window.isActive = false;
    });

})();
