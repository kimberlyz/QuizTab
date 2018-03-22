$(document).ready(function() {
  $("a").click(function() {
    authorize();
  });

  function authorize() {
    var csrf_token = "pineapple"; // TODO: Change later to cryptographically secure token
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

        alert(params);

        var state = params.get("state");
        var code = params.get("code");

        // TODO: if state is correct
        $.ajax
        ({
          type: "POST",
          url: "https://api.quizlet.com/oauth/token",
          data: {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: redirect_uri,
          },
          headers: {
            "Authorization": "xxx",
          },
          dataType: "json",
          success: function (data) {
            alert("access token: " + data.access_token + "\nuser_id: " + data.user_id);
            console.info(data);
            getUserData(data);
          },
          error: function(jqXHR, textStatus, error) {
            alert("There was a problem. Please try logging in again.");
          }
        });
      }
    );
  }

  function getUserData(data) {
    $.ajax
    ({
      url: "https://api.quizlet.com/2.0/users/" + data.user_id,
      headers: {
        "Authorization": "Bearer " + data.access_token,
      },
      dataType: "json",
      success: function (data) {
        alert("SUCCESS");
        var numSets = data.sets.length;
        console.log(numSets);
        console.log(data);
        $(data.sets).each(function() {
          console.log($(this));
        });
      },
      error: function(jqXHR, textStatus, error) {
        alert("Error. Could not retrieve your flashcard sets.");
      }
    });
  }
});
