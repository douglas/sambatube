var Zencoder = {};
Zencoder.base_url = "https://app.zencoder.com/api/v2/";
Zencoder.base_job_url = function(id) {
    var url = 'https://app.zencoder.com/jobs/' + id;
    return url;
};

// Pull some stuff out of localStorage if available
Zencoder.jobs = localStorage.jobs ? JSON.parse(localStorage.jobs) : null;
/* Set up the default template if there isn't one in localStorage */
if (localStorage.request_template) {
    Zencoder.request_template = JSON.parse(localStorage.request_template);
} else {
    /* Default request template. Keep it simple, but with a thumb for the history bar. */
    var request = {
        input: 'Ignore -- This is filled in upon successful upload',
    };
    localStorage.request_template = JSON.stringify(request);
    Zencoder.request_template = request;
}

// Now it's time to build a request off of the template
// We want to add at least one thumbnail if none are in the request already
Zencoder.request = function(file) {
    Zencoder.request_template.input = file.url;

    if (!Zencoder.request_template.outputs || !Zencoder.request_template.outputs[0].thumbnails) {
        // If there is no outputs array, create one first (with a hash inside), then add thumbnails.
        if (!Zencoder.request_template.outputs) { Zencoder.request_template.outputs = [{}]; }
        Zencoder.request_template.outputs[0].thumbnails = {
            number: 1,
            public: true
        };
    }
    return Zencoder.request_template;
};

$(function() {
    // Set the ZenCoder API key
    Zencoder.api_key = $('#api-key').val();

    // Set your Filepicker.io API key
    filepicker.setKey('AACRnG3VDSwyJfHqeN06ez');

    // We'll be referencing these elements a few times,
    // so we might as well put them in vars.
    var $dz = $('#dropZone');
    var $dzResult = $('#localDropResult');

    var acceptedExtensions = ['3g2','3gp','3gp2','3gpp','3gpp2','aac','ac3','eac3','ec3','f4a','f4b','f4v','flv','highwinds','m4a','m4b','m4r','m4v','mkv','mov','mp3','mp4','oga','ogg','ogv','ogx','ts','webm','wma','wmv'];

    // Set up our Filepicker.io Drop Pane.
    filepicker.makeDropPane($dz, {
        multiple: false,
        extensions: acceptedExtensions,
        location: 's3',
        dragEnter: function() {
            $dz.find('h1').text('Drop to upload');
            $dz.removeClass('normal').addClass('over');
        },
        dragLeave: function() {
            $dz.find('h1').text('Drop files here');
            $dz.removeClass('over').addClass('normal');
        },
        onSuccess: function(fpfiles) {
            $dz.find('h1').text('File uploaded. Encoding...');
            $dz.find('p').text('');
            Zencoder.utils.createJob(fpfiles[0], $dz);
        },
        onError: function(type, message) {
            $dzResult.text('('+type+') '+ message);
        },
        onProgress: function(percentage) {
            $dz.find('h1').text('Uploading ('+percentage+'%)');
        }
    });

    // We've got a drop pane...but what if we also made the whole thing clickable for normal upload
    $dz.click(function(e){
        filepicker.pickAndStore({extensions:acceptedExtensions,openTo:'COMPUTER'},{location:"S3"}, function(fpfiles){
            $dz.find('h1').text('File uploaded. Encoding...');
            $dz.find('p').text('');
            Zencoder.utils.createJob(fpfiles[0], $dz);
        });
    });

    // SETTINGS INTERFACE
    // Pull out the settings board
    $('#settingsBtn').click(function(e) {
        e.preventDefault();
        var toggleSettings = $('#navigation').width() == 200 ? '25px' : '200px';
        $('#navigation').animate(
            { width: toggleSettings },
            function() {
                $('.navigationContent').toggle();
            }
        );
    });

    /* Clear all the data and refresh the page */
    $('#clearData').click(function(e) {
        e.preventDefault();
        localStorage.clear();
        document.location.reload();
    });

    /* Request Editor Modal */
    $('#showRequestEditor').click(function(e){
        e.preventDefault();
        // Show the editor and populate it with what's in localStorage
        $('#requestEditor').fadeIn(function(){
            $('#requestEditor textarea').val(JSON.stringify(Zencoder.request_template));
            $('#cancelEditRequest').click(function(e){
                e.preventDefault();
                $('#requestEditor').fadeOut();
            });
            $('#saveRequest').click(function(e){
                e.preventDefault();
                var newRequest = $('#requestEditor textarea').val();
                var updateResult = Zencoder.utils.updateRequestTemplate(newRequest);
                if (updateResult) {
                    console.log('New template saved...');
                    $('#requestEditor').fadeOut();
                } else {
                    console.log('Something went wrong...');
                }
            });
        });
    });
});

// It's just a demo, but let's put our functions in Zencoder.utils to be good JS citizens anyway.
Zencoder.utils = {};

// Send the create request to Zencoder
Zencoder.utils.createJob = function(file, $element) {
    // Let's use $.ajax instead of $.post so we can specify custom headers.
    $.ajax({
        url: Zencoder.base_url + 'jobs',
        type: 'POST',
        data: JSON.stringify(Zencoder.request(file)),
        headers: { "Zencoder-Api-Key": Zencoder.api_key },
        dataType: 'json',
        success: function(data) {
            console.log(data);
            // Once the file is uploaded, start polling Zencoder for progress
            Zencoder.utils.pollZencoder(data.id, $element);
        },
        error: function(data) {
            console.log(data);
        }
    });
};

// Poll the Zencoder API for progress
Zencoder.utils.pollZencoder = function(jobId, $element) {
    $.ajax({
        url: Zencoder.base_url + 'jobs/' + jobId + '/progress' ,
        type: 'GET',
        headers: { "Zencoder-Api-Key": Zencoder.api_key },
        //dataType: 'json',
        success: function(data) {
            if (data.state != 'finished') {
                console.log(data);

                // We don't want to update progress while the job is still queued
                if (data.state != 'waiting') {
                    $element.find('h1').text('Encoding ('+ data.progress.toFixed(2) +'%)');
                }
                // Since the job isn't finished, wait 3 seconds and poll again
                setTimeout(function() { Zencoder.utils.pollZencoder(jobId, $element); }, 3000);
            } else {
                // Job is finished, so let the user know.
                $element.find('h1').html('Finished. <a href="https://app.zencoder.com/jobs/'+ jobId +'">View Job</a>');
                $element.find('p').text('You can drag another file or click to encode another at any time.');
                Zencoder.utils.updateJobs();
            }
        },
        error: function(data) {
            console.log(data);
        }
    });
};

// Update the Jobs object
Zencoder.utils.updateJobs = function() {
    console.log('Checking for new jobs...');
    $.ajax({
        url: Zencoder.base_url + 'jobs/',
        type: 'GET',
        headers: { "Zencoder-Api-Key": Zencoder.api_key },
        success: function(data) {
            // We'll be comparing values from Zencoder.jobs and data.job, so make sure exist first (and have things in them).
            // If they do, see if the newest local job is the same as the newest retrieved job.
            if (data && Zencoder.jobs && (data.length > 0) && (Zencoder.jobs.length > 0) && (Zencoder.jobs[0].job.id == data[0].job.id)) {
                console.log('Jobs are already up to date...');
            } else {
                // There are either no jobs or new jobs
                if (data.length === 0) { // No jobs were returned
                    $('#videoList').html('<h3>You have no jobs! Go ahead and upload one...</h3>');
                } else { // New jobs were found, so replace local information with the stuff we just received
                    Zencoder.jobs = data;
                    localStorage.setItem('jobs', JSON.stringify(Zencoder.jobs));
                    Zencoder.utils.listJobs(Zencoder.jobs);
                }
            }
        },
        error: function(data) {
            var errorMsg;
            if (data.status == 401) {
                // API key was incorrect...
                localStorage.clear();
                errorMsg = 'Invalid Zencoder API Key';
            } else {
                errorMsg = "Something went wrong!";
            }
            $('#dropZone, #historyBar, #navigation').hide();
            // Let the user know what the error was
            $('#api-key').addClass('error');
            $('.alert').replaceWith('<p class="alert error">'+ errorMsg + '</p>');
            $('#setup').fadeIn();
        }
    });
};

// List the last 50 jobs along the bottom
Zencoder.utils.listJobs = function(jobs) {
    if (jobs) {
        // There are jobs, so it's time to update them.
        // Remove whatever's currently there
        $('#videoList').empty();
        $.each(jobs, function(index, value){
            if (value.job.thumbnails.length === 0) {
                // Job didn't have an image, so display a placeholder
                $('#videoList').append('<a href="'+ Zencoder.base_job_url(value.job.id) + '/"><img src="./images/place.jpg"/></a>');
            } else {
                // Job has a thumbnail, so display it.
                $('#videoList').append('<a href="'+ Zencoder.base_job_url(value.job.id) +'/"><img src="'+ value.job.thumbnails[0].url +'" onError="this.onerror=null;this.src=\'./images/place.jpg\';"/></a>');
            }
        });
        // updateJobs() is never called directly, so we could have just displayed out of date local info.
        this.updateJobs();
    } else {
        // No jobs, so make sure there isn't anything new with Zencoder
        this.updateJobs();
    }
};

// Mechanism to update the request template
Zencoder.utils.updateRequestTemplate = function(request) {
    if (request) {
        try {
            // Make sure the new template is valid JSON
            var newRequest = JSON.parse(request);

            // We know we've got a valid template, so update Zencoder.request_template and localStorage.requestTemplate
            localStorage.request_template = JSON.stringify(newRequest);
            Zencoder.request_template = newRequest;
            return true;
        } catch(e) {
            console.log(e);
            return false;
        }
    }
};
