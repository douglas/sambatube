from fabric.api import task, local


@task
def prepare_assets():
    """ Copy only the assets we need after bower get it for us """

    local("rm -rf assets")
    local("bower install")
    local("cp -R assets/bootstrap/assets/js/html5shiv.js static/js")
    local("cp -R assets/bootstrap/assets/js/respond.min.js static/js")
    local("cp -R assets/bootstrap/dist/* static/")
    local("cp -R assets/jquery/jquery.min.js static/js")
    local("cp -R assets/jquery/jquery.min.map static/js")
    local("cp -R assets/speakingurl/speakingurl.min.js static/js")
    local("rm -rf assets")


@task
def deploy_static():
    """ Deploy our static files to s3 as we will use it in production mode """

    local('python -c "import app; app.upload_all()"')


@task
def tests():
    """ Run nosetests for us """

    local("nosetests --with-coverage --cover-erase --cover-package=sambatube --with-specplugin")


@task
def develop():
    """ Prepare our developments environment """

    local("pip install -r requirements/development.txt")
