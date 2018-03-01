'use babel';

import { CompositeDisposable } from 'atom'
import { Directory } from 'atom'
import request from 'request'

export default {

  subscriptions: null,

  activate() {
    this.subscriptions = new CompositeDisposable()

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'pulp:fetch': () => this.fetch()
    }))
  },

  deactivate() {
    this.subscriptions.dispose()
  },
  fetch() {
    let editor
    if (editor = atom.workspace.getActiveTextEditor()) {
      let originalfilePath = editor.getPath();
      let relativeFilePath = originalfilePath;
      projectPaths = atom.project.getPaths()
      projectPaths.map(project => {
        if(originalfilePath.includes(project)) {
          relativeFilePath = originalfilePath.substring(project.length);
        }
      });
      let repoPromise = this.currentRepository(originalfilePath);
      repoPromise.then((returnVal) => {
        let repo = returnVal;
        if(repo == null) {
          //Not in a git repository currently
          return;
        }
        //Improvement: also check bitbucket/stash api
        let gitUrl = repo.getOriginURL().substring(0, repo.getOriginURL().length-4);
        let githubString = 'github.com';
        let gthbIndex = gitUrl.indexOf(githubString);
        let gitApiUrl = gitUrl.slice(0,gthbIndex) + "api." + githubString + "/repos/" + gitUrl.slice(gthbIndex + githubString.length + 1, gitUrl.length);
        let gitApiUrlArray = gitApiUrl.split("/");
        let repoName = gitApiUrlArray[gitApiUrlArray.length-1];
        relativeFilePath  = relativeFilePath.replace(/\\/g, "/");
        gitApiUrl += "/commits?path=" + relativeFilePath;

        this.download(gitApiUrl, this.processGitHubResponse);
      });
    }
  },
  processGitHubResponse(error, response, body) {
      //Process git hub API response
      if (!error && response.statusCode == 200) {
        let commits = JSON.parse(body);
        if (commits.length > 0){
          //get top (most recent) commit
          let mostRecentCommitDate = commits[0]["commit"]["committer"]["date"];
          console.log('last touched: ' + mostRecentCommitDate);
          var now = new Date();
          var THIRTY_MIN = 30*60*1000;
          if((now - new Date(mostRecentCommitDate)) < THIRTY_MIN) {
              atom.notifications.addWarning('This file was modified recently in git origin - you may want to pull')
          }
        }
      }
  },
  download(apiUrl, callback) {
    // a HTTP URL fetch - takes generic processing function in the form of:
    // callback(error, response, body) { <process results> }
    var options = {
      url: apiUrl,
      headers: {
        'User-Agent': 'request'
      }
    };
    request(options, callback);
  },
  currentRepository(filePath) {
    //based on the file path, return the git repo for that directory
    //Note: Windows file path specific
    let filePaths = filePath.split('\\');
    let directoryStructure = '';
    for(i = 0; i < filePaths.length - 1; i++ ) {
      directoryStructure += filePaths[i] + '\\';
    }
    directoryStructure = directoryStructure.trim(0, directoryStructure.length -1);
    return atom.project.repositoryForDirectory(new Directory(directoryStructure));
  }
};
