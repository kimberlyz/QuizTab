$(document).ready(function() {
  $("h1").click(function() {
    authorize();
  });

  function authorize() {
    var csrf_token = "pineapple"; // Change later to cryptographically secure token
    var redirect_uri = chrome.identity.getRedirectURL("quizlet_cb");
    var url_params = {
      response_type: "code",
      client_id: "9DYyXZUvbt",
      scope: "read",
      state: csrf_token,
      redirect_uri: redirect_uri
    };
    var auth_url = "https://quizlet.com/authorize?" + $.param(url_params);

    chrome.identity.launchWebAuthFlow({'url': auth_url, 'interactive': true},
      function(redirect_url) {
        const url = new URL(redirect_url);
        const params = new URLSearchParams(url.search);

        var received_state = params.get("state");
        var access_token = params.get("code");
      }
    );
  }
});
