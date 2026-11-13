---
title: "Projects"
description: "Independent projects built with Claude Code and the academic research projects behind my papers, from Mockingbird to contextualized word vectors."
---

## Independent Projects

Projects I build outside work. Both were built with Claude Code.

### NYC Book Finder

Live shelf availability for any book across 35+ New York bookstores. I use it several times a week.

New York’s bookstores sell through a handful of different store platforms, so instead of custom code for each store, the app has seven store-platform adapters, one per platform. Each site gets its own rate limit, and a replay-based test suite lets the adapters be tested without sending requests to the stores. Built with TypeScript and Next.js.

### [Trip Language Trainer](https://github.com/ahare63/trip-trainer)

A spaced-repetition app for Mandarin, Korean, and Japanese, with 255 cards. The first version was built in an evening.

In progress: an agent conversation partner for practice, and an evaluation gate that checks generated cards before they are added.

## Academic Projects

This section is meant to showcase some work I've done in the past in a bit more detail.

Code and reports for all projects are available at [my GitHub](https://github.com/ahare63).

### Mockingbird

_Spring - Fall 2019_

- This project was my Master's dissertation at Oxford.
- I began exploring the field of explainable/interpretable AI for this project and quickly became interested in how these tools could be applied to algorithmically generated profiles based on social media data. Such profiles have the potential to impact life-altering decisions and yet few users are aware of what is or can be inferred about them based on their social media accounts. The Mockingbird tool allows users to see algorithmic profiles based on their Twitter data, view explanations for many of them, and intelligently alter their tweets to change their algorithmic profiles.

- After doing some research on existing techniques, I built the Mockingbird tool (formerly hosted at mockingbird.hip.cat; no longer online, but the [code and report are on GitHub](https://github.com/ahare63/mockingbird)).
- This tool first scrapes Twitter data using a modified version of the [Twint](https://github.com/twintproject/twint) library.

- Mockingbird then generates more than twenty algorithmic profiles. Some of these profiles use existing tools such as lexicons and pre-trained networks, although I also trained several neural networks for profiling purposes.
- Once users have seen their profiles, they are able to view more information about them, often including explanations.

- Users are then able to alter the text of their tweets and see how that affects their profiles. In some cases, users are assisted by synonym suggestions and automatic "style translations" using a GAN trained to generate adversarial examples (see [Shetty et al., 2018](https://www.usenix.org/system/files/conference/usenixsecurity18/sec18-shetty.pdf)).
- After building Mockingbird, I ran a number of lab sessions where participants experimented with the Mockingbird tool and provided commentary and feedback.

- Overall, users seemed interested in algorithmic profiles but unwilling to change their behavior to control them. I suspect this would be different if the profiles were used in the context of a major life-altering decision such as job recruitment rather than for advertising purposes.
- This dissertation was awarded the mark of distinction, the highest level of honors possible at Oxford.

### Contextualized Word Vectors

_Spring 2019_

- This was the final project for the class "Advanced Machine Learning" at Oxford and was completed with three other Master's students.
- The project consisted of reproducing and extending ["Learned in Translation: Contextualized Word Vectors" by McCann et al](https://arxiv.org/abs/1708.00107). This paper attempts to expand pre-trained word embeddings beyond global values (such as [GloVe](https://www.aclweb.org/anthology/D14-1162)) to include the context of the word. To generate these embeddings, we train a sequence-to-sequence model traditionally used for neural machine translation (NMT) and use the output of its encoder as the embedding. These embeddings were then tested on downstream tasks such as sentiment analysis using a Biattentive Classification Network (BCN).

- After reproducing the NMT and Biattentive Classification Networks (BCN) models from this paper, I added two novel extensions with another student. We tried replaced the LSTM-based encoder with CNN and Transformer encoders, and found that they tended to boost performance over the LSTM-based encoder.
- This project was done using Python's keras and tensorflow 2.0 libraries on Google Colabratory notebooks, making use of the GPUs provided there.

- A [poster](https://github.com/ahare63/AML-CoVe/blob/master/conference-poster.pdf) detailing the extensions was presented at the [Oxford Computer Science Conference 2019](https://www.cs.ox.ac.uk/news/1691-full.html) with the title "An Exploration of Contextualized Word Vectors for Sentiment Analysis."

### News, Satire, Fake News

_Fall 2017 - Spring 2018_

- This project was my senior thesis, completed as coursework at Princeton.
- Given that so-called "fake news" has become a talking point and that many are concerned about the influence such pieces may have on voters' information, this thesis aims to address identifying "fake news" using machine learning techniques. It also addresses satire, as satirical sites are often identified as "fake news" but are easier to identify than "fake news" sites.

- I first gathered a corpus of well over 100,000 serious news articles and 13,000 satirical ones using webscraping and academic resources. Next, I cleaned the data, removing or fixing articles that were not extracted properly. I then extracted relevant features using Python libraries such as nltk and my own custom functions. Features include presence of outside links, profanity, and reading level in addition to a bag-of-words representation of each article and title.
- After doing some data exploration, I built an SVM using sk-learn and trained and tested on my data. I also built a C-LSTM in keras to attempt the same task. I ran both of these on one of Princeton's clusters and found that both achieved over 99% accuracy and precision and recall above 90%.

- After completing the thesis, I refactored and rewrote to make the project more readable, more modular, and generally more usable. I also added substantial documentation for each function.
- This thesis won the S. S. Wilks Memorial Prize for the "best undergraduate thesis applying statistical methods to societal problems."

### Silent Majority

_Spring 2017_

- This project was completed for the course "Machine Learning," taught as part of my undergraduate semester abroad at Oxford.
- For this, my first machine learning project, I decided to predict my friends' political leanings based on their Facebook page likes. To gather the data, I built a Google Chrome extension to scrape my friends' page likes and labelled each friend by hand. I then used collaborative filtering and a simple feed-forward neural network to make binary predictions.

- The classifier did only slightly better than random, likely due to the tiny dataset (~100 users) and possibly noisy labels.
- This project also served as my introduction to Python, JavaScript, HTML, keras, and pandas. Each of these were learned through looking at documentation and similar projects on GitHub.
