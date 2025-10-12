-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 12, 2025 at 10:37 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `barakosense_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `lexicon`
--

CREATE TABLE `lexicon` (
  `id` int(11) NOT NULL,
  `descriptor` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `definition` text NOT NULL,
  `intensity` int(11) DEFAULT NULL CHECK (`intensity` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lexicon`
--

INSERT INTO `lexicon` (`id`, `descriptor`, `category`, `definition`, `intensity`) VALUES
(1, 'Floral', 'Aroma', 'A scent reminiscent of flowers such as jasmine or rose.', 3),
(3, 'Creamy', 'Texture', 'A smooth, rich mouthfeel often linked to full-bodied coffee.', 5),
(4, 'Bright', 'Acidity', 'Crisp and lively acidity that enhances flavor perception.', 3),
(5, 'Lingering Sweetness', 'Aftertaste', 'A pleasant sweet flavor that remains after swallowing.', 4),
(6, 'Fruity', 'Flavor', 'Taste reminiscent of fruits like berries, citrus, or stone fruits.', 4),
(7, 'Spicy', 'Aroma', 'Aroma characterized by spices like cinnamon, cloves, or pepper.', 3),
(8, 'Earthy', 'Aroma', 'Aroma evoking the smell of earth, soil, or forest floor.', 3),
(9, 'Sweet', 'Flavor', 'Taste sensation of sweetness, often associated with sugars or caramel.', 4),
(11, 'Smooth', 'Texture', 'Texture perceived as smooth and even on the palate.', 4),
(12, 'Silky', 'Texture', 'Texture perceived as silky and delicate on the palate.', 5),
(15, 'Chocolate', 'Flavor', 'Flavor notes reminiscent of chocolate or cocoa.', 4),
(16, 'Woody', 'Aroma', 'Aroma reminiscent of wood or timber.', 3),
(17, 'Caramel', 'Flavor', 'Sweet, burnt sugar flavor notes.', 4),
(18, 'Smoky', 'Aroma', 'Aroma of smoke from roasting process.', 2),
(19, 'Tangy', 'Acidity', 'Sharp, tart acidity.', 3),
(20, 'Velvety', 'Texture', 'Extremely smooth, luxurious mouthfeel.', 5),
(21, 'Citrus', 'Flavor', 'Bright, zesty citrus notes.', 4);

-- --------------------------------------------------------

--
-- Table structure for table `results`
--

CREATE TABLE `results` (
  `result_id` int(11) NOT NULL,
  `upload_id` int(11) DEFAULT NULL,
  `leaf_prediction` varchar(100) DEFAULT NULL,
  `leaf_confidence` decimal(5,2) DEFAULT NULL,
  `bark_prediction` varchar(100) DEFAULT NULL,
  `bark_confidence` decimal(5,2) DEFAULT NULL,
  `cherry_prediction` varchar(100) DEFAULT NULL,
  `cherry_confidence` decimal(5,2) DEFAULT NULL,
  `final_result` varchar(100) DEFAULT NULL,
  `final_confidence` decimal(5,2) DEFAULT NULL,
  `date_predicted` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `results`
--

INSERT INTO `results` (`result_id`, `upload_id`, `leaf_prediction`, `leaf_confidence`, `bark_prediction`, `bark_confidence`, `cherry_prediction`, `cherry_confidence`, `final_result`, `final_confidence`, `date_predicted`) VALUES
(1, 1, 'Coffea Liberica', 92.07, 'Coffea Liberica', 85.42, 'Coffea Liberica', 88.95, 'Coffea Liberica', 88.81, '2025-10-12 11:39:20');

-- --------------------------------------------------------

--
-- Table structure for table `uploads`
--

CREATE TABLE `uploads` (
  `upload_id` int(11) NOT NULL,
  `leaf_image` varchar(255) DEFAULT NULL,
  `bark_image` varchar(255) DEFAULT NULL,
  `cherry_image` varchar(255) DEFAULT NULL,
  `date_uploaded` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `uploads`
--

INSERT INTO `uploads` (`upload_id`, `leaf_image`, `bark_image`, `cherry_image`, `date_uploaded`) VALUES
(1, '1760240359089-650140164.png', '1760240359091-95073220.jpg', '1760240359094-340261329.png', '2025-10-12 11:39:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `lexicon`
--
ALTER TABLE `lexicon`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `results`
--
ALTER TABLE `results`
  ADD PRIMARY KEY (`result_id`),
  ADD KEY `upload_id` (`upload_id`);

--
-- Indexes for table `uploads`
--
ALTER TABLE `uploads`
  ADD PRIMARY KEY (`upload_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `lexicon`
--
ALTER TABLE `lexicon`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `results`
--
ALTER TABLE `results`
  MODIFY `result_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `uploads`
--
ALTER TABLE `uploads`
  MODIFY `upload_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `results`
--
ALTER TABLE `results`
  ADD CONSTRAINT `results_ibfk_1` FOREIGN KEY (`upload_id`) REFERENCES `uploads` (`upload_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
