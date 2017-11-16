module.exports = (robot) => {
  // Your code here
  console.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/

  // synchronize

  robot.on('pull_request.opened', async context => {

    const user = context.payload.pull_request.user.login;
    const reviewerCount = 2;
    const message =     
    `Hello @${user}! I'm your friendly review bot.
    
    To get this PR merged you'll need the approval of ${reviewerCount} reviewers at least.
    
    Our Code Review Rules just in case:
    https://docs.google.com/spreadsheets/d/1mZCNhit1fXvsXw4mOJS1CgONT78sVB8-5VswbgaEZq8`;

    // const message = Hello @' + context.payload.pull_request.user.login + '! I am your friendly review bot!'
    const params = context.issue({ body: message });

    await context.github.issues.createComment(params);

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.number
    });

    let stateToSet = "error";
    let descriptionToSet = "At least 2 reviewers must approve this pull request.";
    let labelsToSet = ["review:pending"];


    if (context.payload.pull_request.head.ref === "feature/xcdatamodel" && context.payload.pull_request.base.ref === "develop") {

      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:not-required"];

      await context.github.issues.addLabels({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        number: context.payload.number,
        labels: labelsToSet
      });

    }


    await context.github.repos.createStatus({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
      state: stateToSet,
      description: descriptionToSet,
      context: "TapWiser Bot"
    });

  });

  robot.on('pull_request_review.submitted', async context => {

    // let state = context.payload.review.state;

    let reviews = await context.github.pullRequests.getReviews({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
    });

    reviews = reviews.data;

    let numberOfApprovals = 0;

    console.log("aqui "+ JSON.stringify(reviews));

    for (var i = 0; i < reviews.length; i++) {

      let review = reviews[i];

      // console.log(review);

      // number of approvals from the OTHER users
      // if ( (review.state === "APPROVED" || review.state === "approved") && review.user.login !== context.payload.pull_request.user.login) {
      if (review.state === "APPROVED" || review.state === "approved") {
        numberOfApprovals++;
      }

    }

    // console.log("approvals = " + numberOfApprovals);

    await context.github.issues.removeAllLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number
    });

    let stateToSet = "error";
    let descriptionToSet = "At least 2 reviewers must approve this pull request.";
    let labelsToSet = ["review:pending"];

    if (numberOfApprovals >= 2) {
      stateToSet = "success";
      descriptionToSet = "We are all set!"
      labelsToSet = ["review:done"];
    }

    await context.github.issues.addLabels({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      number: context.payload.pull_request.number,
      labels: labelsToSet
    });

    await context.github.repos.createStatus({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      sha: context.payload.pull_request.head.sha,
      state: stateToSet,
      description: descriptionToSet,
      context: "TapWiser Bot"
    });



    // state = approved
    // state = changes_requested


  });

  robot.on('pull_request.closed', async context => {

    const isMerged = context.payload.pull_request.merged && context.payload.pull_request.merged === true;

    if (isMerged) {

      const message = 'Hey @' + context.payload.pull_request.user.login + '👋\n\n' +
        'Thank you for your contribution and congrats on getting this pull request merged 🎉\n\n' +
        'The code change now lives in the ' + context.payload.pull_request.base.ref + ' branch.';

      const params = context.issue({ body: message });

      return context.github.issues.createComment(params);

    }

  });


}
