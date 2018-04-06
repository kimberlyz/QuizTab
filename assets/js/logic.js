/**
 * PG01 - Login and Authentication
 * PG02 - Flashcard Sets Display
**/
$(document).ready(function() {

  $("#sets-page").addClass("hide");
  load_background();

  $("#login-button").click(function() {
    authorize();
  });

/* PG01 - Login and Authentication
===============================================================================
*/
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

    // TODO: Refactor this
    await Promise.all([saveAccessTokenPromise, saveUserIDPromise]).then(function(values) {
      $("#login-page").addClass("hide")
      $("#sets-page").removeClass("hide");
      $("body").addClass("blue-background");
      $("#card").flip({
        trigger: 'manual'
      });
      $("#card").click(function() {
        $("#card").flip('toggle');
      });
      $(document).keypress(function(e) {
        if (e.which == 32) {
          $("#card").flip('toggle');
        }
      });
      getUserDataAndSets();
    });
  }

/* PG02 - Flashcard Sets Display
===============================================================================
*/
  async function getUserDataAndSets() {
    var getAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['access_token'], function(result) {
        resolve(result.access_token);
      });
    });

    var getUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['user_id'], function(result) {
        resolve(result.user_id);
      });
    });

    var result = await Promise.all([
     getAccessTokenPromise,
     getUserIDPromise,
    ]);

    var access_token = result[0];
    var user_id = result[1];

    getSets(access_token, user_id);
  }

  function getSets(access_token, user_id) {
    $.ajax
    ({
      url: "https://api.quizlet.com/2.0/users/" + user_id,
      headers: {
        "Authorization": "Bearer " + access_token,
      },
      dataType: "json",
      success: function (data) {
        populateSetTitles(data.sets);
      },
      error: function(jqXHR, textStatus, error) {
        alert("Error. Could not retrieve your flashcard sets.");
      }
    });
  }

  function populateSetTitles(dataSets) {
    $(dataSets).each(function() {
      console.log(this.title);
      var setRow = "<div class='row'>"
                    + "<h2>" + this.title + "</h2>"
                    + "<p>Some text...</p>";
                    + "</div>";
      $("#container").append(setRow);
    });
    $("container").removeClass("hide");
  }
});
