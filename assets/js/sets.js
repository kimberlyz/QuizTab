$(document).ready(function() {
  getUserDataAndSets();
  // TODO: Deal with errors when getting these values from chrome storage
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
    $("body").append("<p>Additional Text.</p>");
  };
});
