/**
 * CH01 - Login and Authentication
 * CH02 - Get User ID And Access Token
 * CH03 - Sets Display
 * CH04 - Flashcard Display
 * CH05 - Navigation
**/
$(document).ready(function() {

  var user_id;
  var access_token;
  var terms;
  var term_index;
  var current_indices;

  getUserData().then(function(values) {
    user_id = values['user_id'];
    access_token = values['access_token'];
    var set_id = values['set_id'];

    console.log("Values", user_id, access_token, set_id);

    if (access_token === 'XXX') {
      showLogin();
    } else if (set_id === 'XXX') {
      showSets();
    } else {
      showFlashcards(set_id);
    }
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
          success: saveUserDataAndShowSets,
          error: function(jqXHR, textStatus, error) {
            alert("There was a problem. Please try logging in again.");
          }
        });
      }
    );
  }

  // TODO: Deal with errors when saving these values into chrome storage
  async function saveUserDataAndShowSets(data) {
    chrome.storage.sync.set({'user_id': data.user_id,
                             'access_token': data.access_token
                            },function() {
      if (chrome.runtime.lastError) {
        console.log("Error saving user_id and access_token");
      } else {
        $("#login-page").addClass("hide");
        $("#sets-page").removeClass("hide");

        user_id = data.user_id;
        access_token = data.access_token;

        getSets(user_id, access_token);
      }
    });
  }

  async function saveSetID(set_id) {
    chrome.storage.sync.set({'set_id': set_id}, function() {
      if (chrome.runtime.lastError) {
        console.log("Problem saving set_id");
      }
    })
  }

/* CH02 - Get User ID And Access Token
===============================================================================
*/
  function getUserData() {
    return new Promise(function(resolve, reject) {
      chrome.storage.sync.get({'user_id':'XXX',
                               'access_token':"XXX",
                               'set_id':'XXX'
                              }, function(result) {
        if (chrome.runtime.lastError) {
          console.log("Problem getting user data");
          resolve(false);
        } else {
          resolve({
            user_id: result.user_id,
            access_token: result.access_token,
            set_id: result.set_id
          });
        }
      });
    });
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
    var set_id = $(this).data("set-id");
    console.log("SET ID", set_id);

    showFlashcards(set_id);
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

  function getSetFlashcards(set_id, access_token) {
    $.ajax
    ({
      url: "https://api.quizlet.com/2.0/sets/" + set_id,
      headers: {
        "Authorization": "Bearer " + access_token,
      },
      dataType: "json",
      success: function (data) {
        terms = data.terms;
        current_indices = [...Array(terms.length).keys()];
        current_indices = shuffle(current_indices);
        term_index = 0;
        saveSetID(set_id);

        $(".inner-bar").width(calcWidthPercentage());
        $(".progress-label").text(`${term_index + 1}/${current_indices.length}`);

        populateFlashcard(current_indices[term_index]);
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
    if (term_index - 1 >= 0) {
      term_index -= 1;
      populateFlashcard(current_indices[term_index]);
      updateProgressBar();
    }
  }

  function nextCard() {
    if (term_index + 1 < terms.length) {
      term_index += 1;
      populateFlashcard(current_indices[term_index]);
      updateProgressBar();
    }
  }

  function populateFlashcard(index) {
    var oneTerm = terms[index];
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

    getSets(user_id, access_token);
  }

  function showFlashcards(set_id) {
    $("#login-page").addClass("hide");
    $("#sets-page").addClass("hide");

    $(".front .center-text").text("");
    $(".back .center-text").text("");
    $("#flashcards-page").removeClass("hide");

    getSetFlashcards(set_id, access_token);
  }

  function showLogin() {
    loadBackground();

    $("#flashcards-page").addClass("hide");
    $("#sets-page").addClass("hide");

    $("#login-page").removeClass("hide");
    $("#login-button").click(authorize);
  }

  function calcWidthPercentage() {
    var width_percentage = (term_index + 1) / current_indices.length * 100;
    return width_percentage.toFixed(1) + "%";
  }

  function updateProgressBar() {
    $(".inner-bar").animate({width: calcWidthPercentage()}, "fast");
    $(".progress-label").text(`${term_index + 1}/${current_indices.length}`);
  }
});
