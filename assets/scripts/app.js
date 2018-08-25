// Initialize Firebase
var config = {
    apiKey: "AIzaSyCVehJ1ulLwPoTnIXFhkMPUCINBa6ks1Vw",
    authDomain: "getajob-project1.firebaseapp.com",
    databaseURL: "https://getajob-project1.firebaseio.com",
    projectId: "getajob-project1",
    storageBucket: "getajob-project1.appspot.com",
    messagingSenderId: "171249140675"
};
firebase.initializeApp(config);

var database = firebase.database(); // initialize database object for firebase.

var queryURL = "https://goremote.io/api/jobs";
var globalJobObject;
var globalFavJobObject = [];
var favoriteJobs = [];
var currentUser = "";
if (localStorage.getItem("getajobName")) {
    currentUser = localStorage.getItem("getajobName");
}

var currentPage = 1;

jQuery.ajaxPrefilter(function (options) {
    if (options.crossDomain && jQuery.support.cors) {
        options.url = 'https://cors-anywhere.herokuapp.com/' + options.url;
    }
});

function mainJobPull() {
    $.ajax({
        url: queryURL,
        method: "GET"
    }).then(function (response) {
    
        for (var i = 0; i < 10; i++) {
            var index = i;
            var responseIndex = i;
            if (currentPage > 1) {
                responseIndex = i + (currentPage - 1) * 10;
            }
            dSResults(response[responseIndex], index, "jSResults");
        }
        globalJobObject = response;
    }).catch(function (error) {
        console.log("The Following Error Occurred: " + error);
    });
}

// initial job pull from goRemote API.
mainJobPull();

// pagination click handler
$(".page-link").on("click", function() {
    var whatClick = $(this).attr("id");
    if (whatClick == "next") {
        $("#previous").parent().removeClass("disabled");
        currentPage++;
        
    }

    if (whatClick == "previous") {
        currentPage--;
        if (currentPage < 2) {
            $("#previous").parent().addClass("disabled");
        }
    }

    $("#jSResults tbody").empty();
    mainJobPull();
})

// click handler for the search term button (search-btn)
$("#search-btn").on("click", function () {
    event.preventDefault();

    // retrive the job search term user has input into the search field.
    var term = $("#input-fld").val().toLowerCase().trim();
    console.log(term);
});

// retrieve any existing data
database.ref().on("value", function (snapshot) {
    var data = snapshot.child(currentUser).val();
    console.log(data);
    favoriteJobs = (data) ? data : [];
    console.log(favoriteJobs);
    $("#favResults tbody").empty();
    for (var jobid in favoriteJobs) {
        var queryURL = "https://goremote.io/api/job/" + jobid;
        var index = 0;
        console.log(encodeURI(queryURL));
        $.ajax({
            url: queryURL,
            method: "GET"
        }).then(function (response) {
            console.log(index);
            dSResults(response, index, "favResults");
            index++;
            globalFavJobObject.push(response);
            console.log(globalFavJobObject);
        }).catch(function (error) {
            console.log("Something, something dark side: " + error);
        })
    }
});

// create favorite click handler to call firebase database and save new array.
$("#favorite").on("click", function () {
    var jobToFav = $(this).attr("data-jobID");
    console.log(jobToFav);
    // favoriteJobs.push({status: "Not Applied"});

    database.ref().child(currentUser).child(jobToFav).set({
        status: "Not Applied"
    });
});

// Modal Handler
$('#Modal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget); // Button that triggered the modal
    var job;
    if (button.attr("data-modal") == "detailModal") {
        job = globalJobObject[button.attr('data-jobObjID')];
    } else {
        job = globalFavJobObject[button.attr('data-jobObjID')];
    }
    console.log(job); // Pull up the current job listing from the global Job Object.

    var modal = $(this);
    modal.find('#favorite').attr('data-jobID', job.jobid);
    modal.find('.modal-title').text(job.position);
    modal.find('.modal-body #applyurl').html('<a href="' + job.applyurl + '" target="_blank">Apply @ ' + job.sourcename + '</a>');
    modal.find('.modal-body #companyname').text(job.companyname);
    modal.find('.modal-body #googleMap').val(dMView(job.companyname));
    modal.find('.modal-body #description').html(job.description);

    database.ref(currentUser + "/" + job.jobid).once('value', function (snapshot) {
        if (snapshot.exists()) {
            $("#favorite").css("display", "none");
            $("#dropdown").css("display", "block");
        } else {
            $("#favorite").css("display", "block");
            $("#dropdown").css("display", "none");
        }
    });



});

// function display Search Results
function dSResults(jObject, index, whichTable) {
    var r = jObject;
    var status = "Not Applied";
    
    // creating new tableRow to append to the tbody of jSResults.
    var tableRow = $("<tr class='jobItem'>");

    // setting detailModal or favModal data attr
    var whichModal = "";
    if (whichTable == "favResults") {
        whichModal = "favModal";
    } else {
        whichModal = "detailModal";
        status = "NA";
    }

    // filling in each cell data with appropriate information.
    // this could be DRYed up a bit.
    tableRow.append($("<td>").html('<span class="c-title" data-jobObjID="' + index + '" data-toggle="modal" data-target="#Modal" data-modal="' + whichModal + '">' + r.position + '</span>'));
    tableRow.append($("<td>").text(r.companyname));
    tableRow.append($("<td>").text(r.dateadded));
    if (whichTable == "favResults") {
        tableRow.append($("<td>").addClass("status " + index));
    } else {
        tableRow.append($("<td>").text(status));
    }
    tableRow.append($("<td>").html(r.description.substr(0, 100) + "..."));

    database.ref(currentUser + "/" + r.jobid).once("value").then(function (snapshot) {
        $("." + index).text(snapshot.val().status);
    });

    // appending the new tableRow to the exisitng #jSResults table.
    $("#" + whichTable + " tbody").append(tableRow);
}

// display Maps View
function dMView(jobLocation) {
    var map = "<img width='600' src='https://maps.googleapis.com/maps/api/staticmap?center=" + jobLocation + "&zoom=8&scale=13&size=600x300&maptype=roadmap&format=png&visual_refresh=true'>"
    var mapDiv = $("#googleMap");

    mapDiv.empty();
    mapDiv.append(map);
    console.log(map)
}

$("#add-user").on("click", function (event) {
    event.preventDefault();
    var name = $("#name-input").val().trim();
    currentUser = name;
    localStorage.clear();
    localStorage.setItem("getajobName", name);
    database.ref().child(name).set(favoriteJobs);
    displayName();
});

function displayName() {
    var userName = localStorage.getItem("getajobName");
    if (userName != null) {
        $("#userNameDiv").empty();
        $("#userNameDiv").html("<p>Welcome, " + userName);

    }
}

displayName();

$("#sendStatus").click(function () {
    var newStatus = $("#statusChange").val();
    var getID = $("#favorite").attr("data-jobID");
    console.log(newStatus);
    database.ref(currentUser + "/" + getID + "/status").set(newStatus);
    if (newStatus === "Delete") {
        database.ref(currentUser + "/" + getID).remove();
        location.reload();
    }
    location.reload();
});

$(".close").click(function () {
    location.reload();
})