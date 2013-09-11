import os

from flask import Flask, render_template
from flask_s3 import FlaskS3, create_all

app = Flask(__name__, template_folder='templates')
app.config['S3_BUCKET_NAME'] = 'sambatube_assets'
app.config['ZENCODER_API_KEY'] = "733fe8f65f2b914c95c2580e2dd881c8"
app.config['FILEPICKER_API_KEY'] = "AZ8IQueXTRuEuABQpyjCXz"

s3 = FlaskS3(app)


@app.route('/')
def index():
    data = {
        'zencoder_api_key': app.config['ZENCODER_API_KEY'],
        'filepicker_api_key': app.config['FILEPICKER_API_KEY']
    }

    return render_template('index.html', **data)


def upload_all():
    aws_key = 'AKIAIAPZX3KHMEIAJ74Q'
    aws_secret = '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'

    create_all(app, user=aws_key, password=aws_secret)


if __name__ == '__main__':
    # Bind to PORT if defined, otherwise default to 5000.
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
