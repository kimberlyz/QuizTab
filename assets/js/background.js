$(document).ready(function() {

  load_background();
  $("a").click(function() {
    authorize();
  });

  function load_background() {
    var img_tag = new Image();

    // when preload is complete, apply the image to the div
    var img = "assets/img/login-background-large-inter.png";
    img_tag.onload = function() {
      $(".background").css("background-image", "url(" + img + ")");
      $(".background").addClass("fade-in-anim");
    }
    // setting 'src' actually starts the preload
    img_tag.src = img;
  }

  function createAuthURL() {
    var csrf_token = "pineapple"; // TODO: Change later to cryptographically secure token
    var url_params = {
      response_type: "code",
      client_id: "9DYyXZUvbt",
      scope: "read",
      state: csrf_token,
      redirect_uri: chrome.identity.getRedirectURL("quizlet_cb")
    };
    return "https://quizlet.com/authorize?" + $.param(url_params);
  }

  function authorize() {
    var auth_url = createAuthURL();
    console.log("Auth_url " + auth_url);
    chrome.identity.launchWebAuthFlow({'url': auth_url, 'interactive': true},
      function(redirect_url) {
        const url = new URL(redirect_url);
        const params = new URLSearchParams(url.search);

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
            redirect_uri: chrome.identity.getRedirectURL("quizlet_cb"),
          },
          headers: {
            "Authorization": "Basic XXX",
          },
          dataType: "json",
          success: saveUserData,
          error: function(jqXHR, textStatus, error) {
            alert("There was a problem. Please try logging in again.");
          }
        });
      }
    );
  }

  // TODO: Deal with errors when saving these values into chrome storage
  var saveUserData = async function (data) {
    var saveAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'access_token': data.access_token}, function() {
        resolve(data.access_token);
      })
    });

    var saveUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'user_id': data.user_id}, function() {
        resolve(data.user_id);
      })
    });

    await Promise.all([saveAccessTokenPromise, saveUserIDPromise]).then(function(values) {
      window.location.replace("../../sets.html");
    });
  }
});
