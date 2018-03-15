const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// should syntax handler
const should = chai.should();
// requirements from diff files
const { BlogPost } = require('../models');
const { closeServer, runServer, app } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);
// give blog fake data
function seedBlog(){
    console.info('Seeding blog data');
    const seedData = [];
    for(let i=1; i<=10;i++){
        seedData.push({
            title: faker.lorem.sentence(),
            content: faker.lorem.text(),
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            }
        });
    }
    //return promise
    return BlogPost.insertMany(seedData);
}



describe('blog post API resource', function(){
    //before testing endpoint runServer
    before(function(){
        return runServer(TEST_DATABASE_URL);
    });
    // before testing endpoint give blog data
    beforeEach(function(){
        return seedBlog();
        });
        // after endpoint is executed delete the database
        afterEach(function(){
            return tearDownDb();
        });
        // close the server
        after(function(){
            return closeServer();
        });

        describe ('Get Endpoint', function(){
            it('should return all written posts', function(){
                let res;
                return chai.request(app)
                  .get('/posts')
                  .then(_res => {
                    res = _res;
                    res.should.have.status(200);
                    // otherwise our db seeding didn't work
                    res.body.should.have.length.of.at.least(1); 
                 })
         });

        it('should return posts with right fields', function(){
            let resPost;
            return chai.request(app)
            .get('/posts')
            .then(function(res){
                res.should.have.status(200);
                res.should.be.json;
                res.body.should.be.a('array');

                res.body.forEach(function(post){
                    post.should.be.a('object');
                    post.should.include.keys('title','content','author')

                });
                resPost = res.body[0];
                return BlogPost.findById(resPost.id);
            })
            .then(function(post){
                resPost.title.should.equal(post.title);
                resPost.content.should.equal(post.content);
               resPost.author.should.equal(post.authorName);
            });
        });
    });

describe('Post endpoint', function(){
    it('should add a new post', function(){
        const newPost= {
            title: faker.lorem.sentence(),
            author:{
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            },
            content: faker.lorem.text()
        };

        return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res){
            res.should.have.status(201);
            res.should.be.a('object');
            res.body.should.include.keys('title', 'content', 'author');
            res.body.title.should.equal(newPost.title);
            res.body.id.should.not.be.null;
            return BlogPost.findById(res.body.id);
        })
        .then(function(post){
            post.title.should.equal(newPost.title);
            post.content.should.equal(newPost.content);
            post.author.firstName.should.equal(newPost.author.firstName);
            post.author.lastName.should.equal(newPost.author.lastName);
        });
    });

});

describe( 'put endpoint', function(){
    it('should update fields', function(){
        const updateData = {
            title: 'updated Data',
            content: 'this is updated content',
            author: {
                firstName: 'updatedFName',
                lastName: 'updatedLName'
            }
        };
        return BlogPost
        .findOne()
        .then(post =>{
            updateData.id =post.id;

            return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(res => {
            res.should.have.status(204);
            return BlogPost.findById(updateData.id);
        })
        .then(post => {
            post.title.should.equal(updateData.title);
            post.content.should.equal(updateData.content);
            post.author.firstName.should.equal(updateData.author.firstName);
            post.author.lastName.should.equal(updateData.author.lastName);
          });
    });
});

describe( 'delete endpoint', function(){
    it('should delete a post by id', function(){
        let post;
        return BlogPost
        .findOne()
        .then(function(_post) {
            post = _post;
            return chai.request(app).delete(`/posts/${post.id}`);

        })
        then(res=>{
            res.should.have.status(204);
            return BlogPost.findById.name(post.id);
        })
        .then(function(_post){
            should.not.exist(_post);
        });
    });
});
});

//delete the database
function tearDownDb(){
return new Promise((resolve, reject)=>{
    console.warn('deleting database');
    mongoose.connection.dropDatabase()
    .then(result => resolve(result))
    .catch(err => reject(err));
    });
}