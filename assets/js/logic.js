/**
 * CH01 - Login and Authentication
 * CH02 - Get User ID And Access Token
 * CH03 - Sets Display
 * CH04 - Flashcard Display
 * CH05 - Navigation
**/
$(document).ready(function() {

  var user_id; // Currently unused
  var access_token; // Currently unused
  var terms;
  var term_index;
  var current_indices;

  $("#login-page").addClass("hide");
  $("#sets-page").removeClass("hide");

  var user_data = getUserData();
  user_data.then(function(values) {
    var user_id = values[0];
    var access_token = values[1];
    // console.log(user_id);
    // console.log(access_token);
    getSets(user_id, access_token);
  });

  $("#logout").click(logout);

  function logout() {
    chrome.storage.sync.clear(function() {
      if (chrome.runtime.lastError) {
        alert("Error logging out. Please try clearing your chrome browser cache and refresh the page.");
      } else {
        showLogin();
      }
    });
  }

/* CH01 - Login and Authentication
===============================================================================
*/
  function loadBackground() {
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
  async function saveUserData(data) {
    var saveUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'user_id': data.user_id}, function() {
        if (chrome.runtime.lastError) {
          resolve(data.user_id);
        } else {
          reject(console.log("Problem saving user_id"));
        }
      })
    });

    var saveAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.set({'access_token': data.access_token}, function() {
        if (chrome.runtime.lastError) {
          resolve(data.access_token);
        } else {
          reject(console.log("Problem saving access_token"));
        }
      })
    });

    // TODO: Refactor this
    await Promise.all([saveUserIDPromise, saveAccessTokenPromise]).then(function(values) {
      $("#login-page").addClass("hide");
      $("#sets-page").removeClass("hide");

      var user_data = getUserData();
      getSets(user_data[0], user_data[1]);
    });
  }

  async function saveSetID(set_id) {
    // var saveSetIDPromise = new Promise(function (resolve, reject) {
    chrome.storage.sync.set({'set_id': set_id}, function() {
      if (chrome.runtime.lastError) {
        console.log("Problem saving set_id");
      }
    })
    // });
  }

/* CH02 - Get User ID And Access Token
===============================================================================
*/
  async function getUserData() {
    var getUserIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['user_id'], function(result) {
        if (chrome.runtime.lastError) {
          resolve(result.user_id);
        } else {
          reject(console.log("Problem getting user_id"));
        }
      });
    });

    var getAccessTokenPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['access_token'], function(result) {
        if (chrome.runtime.lastError) {
          resolve(result.access_token);
        } else {
          reject(console.log("Problem getting access_token"));
        }
      });
    });

    var getSetIDPromise = new Promise(function (resolve, reject) {
      chrome.storage.sync.get(['set_id'], function(result) {
        if (chrome.runtime.lastError) {
          resolve(result.set_id);
        } else {
          console.log("UMMM");
        }
      });
    });

    var result = await Promise.all([
      getUserIDPromise,
      getAccessTokenPromise,
      getSetIDPromise,
    ]);

    console.log("LOG IS", getSetIDPromise);
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

  function populateSetTitles(dataSets) {
    $(dataSets).each(function() {
      var setRow = "<div class='fast-fade-in set-card' "
                    + "data-set-id='" + this.id + "'>"
                    + "<span class='underline'>"
                    + "<p class='set-title'>" + this.title + "</p>"
                    + "</span>"
                    + "</div>";
      $("#container").append(setRow);
    });
    $("#container").removeClass("hide");
  }

  $("#container").on('click', '.set-card', function(){
    var setID = $(this).data("set-id");
    console.log(setID);

    showFlashcards();
    getUserDataAndSetFlashcards(setID);
  });

/* CH04 - Flashcard Display
===============================================================================
*/
  $("#card").flip({
    trigger: 'manual'
  });

  $("#card").click(function() {
    $("#card").flip('toggle');
  });

  $("#previousCard").click(previousCard);

  $("#nextCard").click(nextCard);

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
        $.current_indices = [...Array($.terms.length).keys()];
        $.current_indices = shuffle($.current_indices);
        $.term_index = 0;
        console.log("GOT HERE");
        console.log($.current_indices);
        saveSetID(set_id);
        populateFlashcard($.current_indices[$.term_index]);
      },
      error: function(jqXHR, textStatus, error) {
        console.log(error);
        alert("Error. Could not retrieve your flashcards.");
      }
    });
  }

  $(document).keydown(function(e) {
    switch(e.which) {
      case 32:
        $("#card").flip('toggle');
        break;

      case 37: // left
        previousCard();
        break;

      case 39: // right
        nextCard();
        break;

      default:
        return; // exit this handler for other keys
    }
  });

  function previousCard() {
    if ($.term_index - 1 >= 0) {
      $.term_index -= 1;
      populateFlashcard($.current_indices[$.term_index]);
    }
  }

  function nextCard() {
    if ($.term_index + 1 < $.terms.length) {
      $.term_index += 1;
      populateFlashcard($.current_indices[$.term_index]);
    }
  }

  function populateFlashcard(index) {
    // var index = Math.floor(Math.random() * $.terms.length);

    var oneTerm = $.terms[index];
    $(".front .center-text").text(oneTerm.term);
    $(".back .center-text").text(oneTerm.definition);
  }

  function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
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

/* CH05 - Navigation
===============================================================================
*/
  $(".open-nav").click(function() {
    $(".side-nav").css("left", "0px");
  });
  $(".close-nav").click(function() {
    $(".side-nav").css("left", "-250px");
  });

  $("#choose-set").click(showSets);

  function showSets() {
    $("#login-page").addClass("hide");
    $("#flashcards-page").addClass("hide");

    $("#sets-page").removeClass("hide");
  }

  function showFlashcards() {
    $("#login-page").addClass("hide");
    $("#sets-page").addClass("hide");

    $(".front .center-text").text("");
    $(".back .center-text").text("");
    $("#flashcards-page").removeClass("hide");
  }

  function showLogin() {
    loadBackground();

    $("#flashcards-page").addClass("hide");
    $("#sets-page").addClass("hide");

    $("#login-page").removeClass("hide");
    $("#login-button").click(authorize);
  }
});
