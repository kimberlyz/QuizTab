/**
 * CH01 - Login and Authentication
 * CH02 - Get User ID And Access Token
 * CH03 - Sets Display
 * CH04 - Flashcard Display
**/
$(document).ready(function() {

  var user_id; // Currently unused
  var access_token; // Currently unused
  var terms;
  var term_index;

  $("#login-page").addClass("hide");
  $("#sets-page").removeClass("hide");

  var user_data = getUserData();
  user_data.then(function(values) {
    var user_id = values[0];
    var access_token = values[1];
    console.log(user_id);
    console.log(access_token);

    getSets(user_id, access_token);
  });

  function show_login() {
    load_background();

    $("#login-button").click(function() {
      authorize();
    });
  }

/* CH01 - Login and Authentication
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
      client_id: "XXX",
      scope: "read",
      state: csrf_token,
      redirect_uri: chrome.identity.getRedirectURL("quizlet_cb")
    };
    return "https://quizlet.com/authorize?" + $.param(url_params);
  }

  function authorize() {
    var auth_url = createAuthURL();
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
    var saveUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'user_id': data.user_id}, function() {
        resolve(data.user_id);
      })
    });

    var saveAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'access_token': data.access_token}, function() {
        resolve(data.access_token);
      })
    });

    // TODO: Refactor this
    await Promise.all([saveUserIDPromise, saveAccessTokenPromise]).then(function(values) {
      $("#login-page").addClass("hide");
      $("#sets-page").removeClass("hide");

      var user_data = getUserData();
      getUserDataAndSets(user_data);
    });
  }

/* CH02 - Get User ID And Access Token
===============================================================================
*/
  async function getUserData() {
    var getUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['user_id'], function(result) {
        resolve(result.user_id);
      });
    });

    var getAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['access_token'], function(result) {
        resolve(result.access_token);
      });
    });

    var result = await Promise.all([
      getUserIDPromise,
      getAccessTokenPromise,
    ]);

    return result;
  }

/* CH03 - Sets Display
===============================================================================
*/
  function getSets(user_id, access_token) {
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

  $("#clear").click(function() {
    $("#container").empty();
  });

  $("#addSets").click(function() {
    getUserDataAndSets();
  });

  function populateSetTitles(dataSets) {
    $(dataSets).each(function() {

      console.log(this.title);
      var setRow = "<div class='fast-fade-in set-card' "
                    + "data-set-id='" + this.id + "'>"
                    + "<span class='underline'>"
                    + "<p class='set-title'>" + this.title + "</p>"
                    + "</span>"
                    + "</div>";
      console.log(setRow);
      $("#container").append(setRow);
    });
    $("#container").removeClass("hide");
  }

  $("#container").on('click', '.set-card', function(){
    var setID = $(this).data("set-id");
    console.log(setID);

    $("#sets-page").addClass("hide")
    $("#flashcard-page").removeClass("hide");

    getUserDataAndSetFlashcards(setID);
  });

/* CH04 - Flashcard Display
===============================================================================
*/
  async function getUserDataAndSetFlashcards(set_id) {
    var user_data = await getUserData();
    var access_token = user_data[1];

    getSetFlashcards(access_token, set_id);
  }

  function getSetFlashcards(access_token, set_id) {
    $.ajax
    ({
      url: "https://api.quizlet.com/2.0/sets/" + set_id,
      headers: {
        "Authorization": "Bearer " + access_token,
      },
      dataType: "json",
      success: function (data) {
        $.terms = data.terms;
        $.term_index = 0;
        populateFlashcard();
      },
      error: function(jqXHR, textStatus, error) {
        console.log(error);
        alert("Error. Could not retrieve your flashcards.");
      }
    });
  }

  $("#card").flip({
    trigger: 'manual'
  });

  $("#card").click(function() {
    $("#card").flip('toggle');
  });

  $(document).keydown(function(e) {
    switch(e.which) {
      case 32:
        $("#card").flip('toggle');
        break;

      case 37: // left
        console.log("Left");
        previousCard();
        break;

      case 39: // right
        console.log("Right");
        nextCard();
        break;

      default:
        return; // exit this handler for other keys
    }
  });

  function previousCard() {
    if ($.term_index - 1 >= 0) {
      $.term_index -= 1;
      populateFlashcard();
    }
  }

  function nextCard() {
    if ($.term_index + 1 < $.terms.length) {
      $.term_index += 1;
      populateFlashcard();
    }
  }

  function populateFlashcard() {
    // var index = Math.floor(Math.random() * $.terms.length);

    var oneTerm = $.terms[$.term_index];
    $(".front .center-text").text(oneTerm.term);
    $(".back .center-text").text(oneTerm.definition);
  }

  // function fixFlip(oneTerm) {
  //   var flip = $("#card").data("flip-model");
  //
  //   // Flip to front while hiding animation
  //   if (flip.isFlipped) {
  //     // $("#card").css("visibility", "hidden");
  //     $("#card").flip();
  //   }
  //   //
  //   //   setTimeout(function() {
  //   //     $(".front .center-text").text(oneTerm.term);
  //   //     $(".back .center-text").text(oneTerm.definition);
  //   //     $("#card").css("visibility", "visible");
  //   //   }, 500);
  //   //
  //   // } else {
  //   //   $(".front .center-text").text(oneTerm.term);
  //   //   $(".back .center-text").text(oneTerm.definition);
  //   // }
  // }

  $("#previousCard").click(function() {
    previousCard();
  });

  $("#nextCard").click(function() {
    nextCard();
  });
});
