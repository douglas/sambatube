// New FilePicker object
function FilePicker(filepicker_api) {
    this.picker = filepicker;
    this.picker.setKey(filepicker_api);
    this.picker.accepted_extensions = [
        '3g2','3gp','3gp2','3gpp','3gpp2','aac','ac3',
        'eac3','ec3','f4a','f4b','f4v','flv','highwinds',
        'm4a','m4b','m4r','m4v','mkv','mov','mp3','mp4',
        'oga','ogg','ogv','ogx','ts','webm','wma','wmv'
    ];
}

FilePicker.prototype.upload_and_send = function(btn_obj, dom_obj, encoder) {
    picker = this.picker;
    btn_obj.click(function(e) {
        picker.pickAndStore(
            {
                extensions: picker.accepted_extensions,
                openTo:'COMPUTER'
            },
            {
                location:"S3"
            },
            function(send_files) {
                dom_obj.text('Arquivo enviado. Convertendo...');
                encoder.create_job(send_files[0], dom_obj);
            }
        );
    });
};

FilePicker.prototype.drop_pane = function(dom_obj) {
    var picker = this.picker;

    picker.makeDropPane(dom_obj, {
        multiple: false,
        extensions: picker.accepted_extensions,
        location: 's3',
        dragEnter: function() {
            dom_obj.find('h1').text('Drop to upload');
            dom_obj.removeClass('normal').addClass('over');
        },
        dragLeave: function() {
            dom_obj.find('h1').text('Drop files here');
            dom_obj.removeClass('over').addClass('normal');
        },
        onSuccess: function(send_files) {
            // dom_obj.find('h1').text('File uploaded. Encoding...');
            // dom_obj.find('p').text('');
            encoder.createJob(send_files[0], dom_obj);
        },
        onError: function(type, message) {
            alert(message);
            //$dzResult.text('('+type+') '+ message);
        },
        onProgress: function(percentage) {
            dom_obj.find('h1').text('Uploading ('+percentage+'%)');
        }
    });
};
