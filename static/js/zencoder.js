// New ZenCoder object
function ZenCoder(api_key) {
    this.base_url = "https://app.zencoder.com/api/v2/";
    this.base_job_url = function(id) {
        var url = 'https://app.zencoder.com/jobs/' + id;
        return url;
    };
    this.request_template = {};
    this.api_key = api_key;
}

// Send the create request to Zencoder
ZenCoder.prototype.create_job = function(file, dom_obj) {
    // Let's use $.ajax instead of $.post so we can specify custom headers.
    encoder = this;
    base_url = encoder.base_url;

    $.ajax({
        url: base_url + 'jobs',
        type: 'POST',
        data: JSON.stringify(encoder.request(file)),
        headers: { "Zencoder-Api-Key": encoder.api_key },
        dataType: 'json',
        success: function(data) {
            // Once the file is uploaded, start polling Zencoder for progress
            encoder.get_progress(data.id, dom_obj);
        },
        error: function(data) {
            console.log(data);
        }
    });
};

// Lets get the job information
ZenCoder.prototype.get_job_details = function(job_id) {
    // Let's use $.ajax instead of $.post so we can specify custom headers.
    encoder = this;
    url = encoder.base_url + 'jobs/' + job_id
    new_url = "https://app.zencoder.com/api/v2/jobs/58257661.json?api_key=733fe8f65f2b914c95c2580e2dd881c8"

    $.ajax({
        url: url,
        type: 'GET',
        headers: { "Zencoder-Api-Key": encoder.api_key },
        success: function(data) {
            console.log(data);
            url = data.job.output_media_files[0].url;
            width = data.job.output_media_files[0].width;
            height = data.job.output_media_files[0].height;

            videojs("encoded_video",
                {
                    "controls": true,
                    "autoplay": false,
                    "preload": "auto",
                    // "width": width,
                    // "height": height
                },
                function(){
                    player = this;
                    player.src([
                        { type: "video/webm", src: url },
                    ]);
                }
            );
        },
        error: function(data) {
            console.log(data);
        }
    });
};

// Poll the Zencoder API for progress
ZenCoder.prototype.get_progress = function(jobId, dom_obj) {
    encoder = this;

    var progress_bar = $("#progress_bar");
    var btn_upload = $("#btn_upload");

    $.ajax({
        url: encoder.base_url + 'jobs/' + jobId + '/progress' ,
        type: 'GET',
        headers: { "Zencoder-Api-Key": encoder.api_key },
        //dataType: 'json',
        success: function(data) {
            if (data.state != 'finished') {
                // We don't want to update progress while the job is still queued
                if (data.state != 'waiting') {
                    var progress = data.progress.toFixed(2);
                    progress_bar.attr("style", "width: " + progress + "%");
                    progress_bar.attr("aria-valuenow", progress);
                    dom_obj.text('Convertendo ('+ progress +'%)');
                }
                // Since the job isn't finished, wait 3 seconds and poll again
                setTimeout(function() { encoder.get_progress(jobId, dom_obj); }, 3000);
            } else {
                // Job is finished, so let the user know.
                encoder.get_job_details(jobId);

                progress_bar.attr("style", "width: 100%");
                progress_bar.attr("aria-valuenow", "100");
                dom_obj.text('Video convertido, assista ao lado =)');
            }
        },
        error: function(data) {
            console.log(data);
        }
    });
};

// Now it's time to build a request off of the template
// We want to add at least one thumbnail if none are in the request already
ZenCoder.prototype.request = function(file) {
    var file_name = file.key.substr(0, file.key.lastIndexOf("."));
    var file_name = getSlug(file_name, {maintainCase: false}) + ".webm";

    this.request_template.input = file.url;
    this.request_template.outputs = [{
        label: "SambaTube: " + file_name,
        url: "s3://sambatube/" + file_name,
        public: true,
    }];

    return this.request_template;
};
