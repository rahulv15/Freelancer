import { Prisma, PrismaClient } from '@prisma/client';
import { existsSync, renameSync, unlinkSync } from 'fs';
import { connect } from 'http2';

export const addGig = async (req, res, next)  => {
  try {
    if (req.files) {
        const fileKeys = Object.keys(req.files);
        const fileNames = [];
        fileKeys.forEach((file) => {
            const date = Date.now();
            renameSync(
                req.files[file].path, "uploads/" + date + req.files[file].originalname
            );
            fileNames.push(date + req.files[file].originalname);
        });
        if(req.query){
            const {
                title,
                description,
                category,
                features,
                price,
                revisions,
                time,
                shortDesc,
            } = req.query;


            const prisma = new PrismaClient();

            await prisma.gigs.create({
                data: {
                    title,
                    description,
                    deliveryTime: parseInt(time),
                    category,
                    features,
                    price: parseInt(price),
                    shortDesc,
                    revisions: parseInt(revisions),
                    createdBy: { connect: { id: req.userId } },
                    images: fileNames,
                },
            });

            return res.status(201).send("Successfully created gig.");
        }
    }
    return res.status(400).send("All properties should be required.");
} catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};


export const getUserAuthGigs = async (req, res, next)  => {
  try {
            const prisma = new PrismaClient();
            const user = await prisma.user.findUnique({
                where: { id: req.userId },
                include: { gigs: true},
                
            });
            return res.status(200).send({ gigs: user?.gigs ?? [] });
} catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

//editing gig 
export const getGigData = async (req, res, next)  => {
  try {
    if (req.params.gigId){
        const prisma = new PrismaClient();
        const gig = await prisma.gigs.findUnique({
            where: { id: parseInt(req.params.gigId) },
            include: { createdBy: true, reviews: { include: { reviewer: true } } },
        });
        const userWithGigs = await prisma.user.findUnique({
        where: {id: gig.createdBy.id},
        include: {gigs: {include: {reviews: true } } },
        });

        const totalReviews = userWithGigs.gigs.reduce(
          (acc, gig) => acc + gig.reviews.length,
          0
        );
        const averageRating = (
          userWithGigs.gigs.reduce(
            (acc, gig) =>
            acc + gig.reviews.reduce((sum, review) => sum + review.rating, 0),
            0
          ) / totalReviews
        ).toFixed(1);

        return res.status(200).json({ gig: { ...gig, totalReviews, averageRating } });
    }
    return res.status(400).send("Gig Id is required.");
  }catch(err){
    console.log(err);
    return res.status(500).send("Internal server Error.")
  }
};


export const editGig = async (req, res, next) => {
  try {
    if (req.files) {
      const fileKeys = Object.keys(req.files);
      const fileNames = [];
      fileKeys.forEach((file) => {
        const date = Date.now();
        renameSync(
          req.files[file].path,
          "uploads/" + date + req.files[file].originalname
        );
        fileNames.push(date + req.files[file].originalname);
      });
      if (req.query) {
        const {
          title,
          description,
          category,
          features,
          price,
          revisions,
          time,
          shortDesc,
        } = req.query;

        const prisma = new PrismaClient();
        const oldData = await prisma.gigs.findUnique({
          where: { id: parseInt(req.params.gigId) },
        });
        await prisma.gigs.update({
          where: { id: parseInt(req.params.gigId) },
          data: {
            title,
            description,
            deliveryTime: parseInt(time),
            category,
            features,
            price: parseInt(price),
            shortDesc,
            revisions: parseInt(revisions),
            createdBy: { connect: { id: parseInt(req.userId) } },
            images:fileNames,
          },
        });
        oldData?.images.forEach((image) => {
          if (existsSync(`uploads/${image}`)) unlinkSync(`uploads/${image}`);
        });

        return res.status(200).send("Successfully Eited the gig.");
      }
    }
    return res.status(400).send("All properties should be required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

//searching gigs
export const searchGigs = async (req, res, next)  => {
  try {
    if (req.query.searchTerm || req.query.category){
        const prisma = new PrismaClient();
        const gigs = await prisma.gigs.findMany(
            createSearchQuery(req.query.searchTerm, req.query.category)
        );
        return res.status(200).json({ gigs });
    }
    return res.status(400).send("Is required");
  }catch(err){
    console.log(err);
    return res.status(500).send("Internal server Error.")
  }
};
const createSearchQuery = (searchTerm, category) => {
  const query = {
    where:{
      OR:[]
    },
    include:{
      createdBy: true,
      reviews: {
        include: {
          reviewer: true,
        },
      },
    },
  };
  if(searchTerm){
    query.where.OR.push({
      title:{ contains:searchTerm, mode: "insensitive" },
    });
  }
  if(category){
    query.where.OR.push({
      title:{ contains:category, mode: "insensitive" },
    });
  }
  return query;
};

//order reviews
const checkOrder = async (userId, gigId) => {
  try {
    const prisma = new PrismaClient();
    const hasUserOrderedGig = await prisma.orders.findFirst({
      where: {
        buyerId: parseInt(userId),
        gigId: parseInt(gigId),
        isCompleted: true,
      },
    });
    return hasUserOrderedGig;
  } catch (err) {
    console.log(err);
  }
};
export const checkGigOrder = async (req, res, next) => {
  try {
    if (req.userId && req.params.gigId) {
      const hasUserOrderedGig = await checkOrder(req.userId, req.params.gigId);
      return res
        .status(200)
        .json({ hasUserOrderedGig: hasUserOrderedGig ? true : false });
    }
    return res.status(400).send("userId and gigId is required.");
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
};

export const addReview = async (req, res, next) => {
  try {
    if(req.userId && req.params.gigId){
      if(await checkOrder(req.userId, req.params.gigId)) {
        if(req.body.reviewText && req.body.rating){
          const prisma = new PrismaClient();
          const newReview = await prisma.reviews.create({
            data:{
              rating: req.body.rating,
              reviewText: req.body.reviewText,
              reviewer: {connect:{id:parseInt(req?.userId) } },
              gig: {connect: { id: parseInt(req.params.gigId) } },
            },
            include: {
              reviewer: true, 
            },
          });
          return res.status(201).json({newReview});
        }
        return res.status(400).send("ReviewText and rating is required.");
      }
      return res.status(400).send("You need to purchase the gig in order to add review.");
    }
    return res.status(400).send("userId and gigId is required.");
  } catch (err) {
    console.log(err);
  }
};